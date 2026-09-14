import { createRequire } from "node:module";

/**
 * Single place that reads package.json so the server banner and the
 * outgoing User-Agent can never disagree about the version.
 */
const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { name: string; version: string };

export const PKG_NAME: string = pkg.name;
export const PKG_VERSION: string = pkg.version;
