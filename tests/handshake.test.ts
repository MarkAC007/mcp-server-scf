import { describe, it, expect, beforeAll } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const serverEntry = resolve(repoRoot, "build", "index.js");
const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as {
  name: string;
  version: string;
};

beforeAll(() => {
  // Ensure the server is built; if not, compile it. Build is cheap and this
  // makes the test safe to run on a fresh clone.
  const built = spawnSync("node", ["--check", serverEntry], { stdio: "ignore" });
  if (built.status !== 0) {
    const build = spawnSync("npm", ["run", "build"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (build.status !== 0) {
      throw new Error("pre-test build failed");
    }
  }
}, 60_000);

async function handshake(): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn("node", [serverEntry], {
      env: { ...process.env, SCF_API_KEY: "scf_test_dummy" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "handshake-test", version: "0.0.1" },
      },
    };
    proc.stdin.write(JSON.stringify(initRequest) + "\n");

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("handshake timed out"));
    }, 10_000);

    proc.stdout.once("data", () => {
      setTimeout(() => {
        clearTimeout(timeout);
        proc.kill();
        const firstLine = stdout.split("\n").find((line) => line.trim().startsWith("{"));
        if (!firstLine) return reject(new Error(`no JSON-RPC response: ${stdout}`));
        try {
          resolvePromise(JSON.parse(firstLine));
        } catch (err) {
          reject(new Error(`invalid JSON-RPC response: ${firstLine} — ${(err as Error).message}`));
        }
      }, 100);
    });

    proc.on("error", reject);
  });
}

describe("MCP initialize handshake", () => {
  it("reports name and version read from package.json (not hardcoded)", async () => {
    const response = (await handshake()) as {
      result: { serverInfo: { name: string; version: string }; capabilities: Record<string, unknown> };
    };
    expect(response.result).toBeTruthy();
    expect(response.result.serverInfo.name).toBe(pkg.name);
    expect(response.result.serverInfo.version).toBe(pkg.version);
    // Regression guard: the old hardcoded value must never come back.
    expect(response.result.serverInfo.version).not.toBe("0.1.0");
  });

  it("declares the tools capability (explicit, not inferred-only)", async () => {
    const response = (await handshake()) as {
      result: { capabilities: { tools?: Record<string, unknown> } };
    };
    expect(response.result.capabilities.tools).toBeDefined();
  });
});
