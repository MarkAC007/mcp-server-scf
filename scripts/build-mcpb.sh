#!/usr/bin/env bash
# Build a signed-ready Claude Desktop .mcpb bundle for mcp-server-scf.
#
# Output: dist/mcp-server-scf.mcpb
#
# Staging layout inside the zip:
#   manifest.json
#   icon.png
#   server/
#     build/index.js        (compiled entry point)
#     build/**/*.js
#     package.json          (runtime, devDependencies stripped)
#     node_modules/         (production deps only)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

STAGING_DIR="$ROOT_DIR/dist/mcpb-staging"
OUTPUT_MCPB="$ROOT_DIR/dist/mcp-server-scf.mcpb"
MANIFEST_SRC="$ROOT_DIR/mcpb/manifest.json"
ICON_SRC="$ROOT_DIR/docs/assets/logo-512.png"

# Read version from package.json — single source of truth.
PKG_VERSION=$(node -p "require('./package.json').version")

echo "▶ Building mcp-server-scf.mcpb @ v${PKG_VERSION}"

# 1) Compile TypeScript
echo "  · Compiling TypeScript…"
npm run build >/dev/null

# 2) Fresh staging directory
rm -rf "$STAGING_DIR" "$OUTPUT_MCPB"
mkdir -p "$STAGING_DIR/server/build"

# 3) Copy compiled server + runtime files
echo "  · Staging server/build…"
cp -R build/* "$STAGING_DIR/server/build/"

# 4) Stripped-down package.json: keep runtime bits only.
#    Drop devDependencies, scripts (prepare/husky), lint-staged, etc.
echo "  · Writing stripped server/package.json…"
node -e "
  const pkg = require('./package.json');
  const out = {
    name: pkg.name,
    version: pkg.version,
    type: pkg.type,
    main: pkg.bin && pkg.bin[pkg.name] ? pkg.bin[pkg.name].replace(/^\.\//, '') : 'build/index.js',
    license: pkg.license,
    dependencies: pkg.dependencies || {},
    engines: pkg.engines || {}
  };
  require('fs').writeFileSync('$STAGING_DIR/server/package.json', JSON.stringify(out, null, 2) + '\n');
"

# 5) Production install inside staging — generate a lockfile for the stripped
#    package.json, then `npm ci` so installs are reproducible and dependency
#    integrity is verified by hash (OpenSSF Scorecard Pinned-Dependencies).
echo "  · Installing production deps into server/node_modules…"
(cd "$STAGING_DIR/server" \
  && npm install --package-lock-only --omit=dev --no-audit --no-fund --ignore-scripts --silent \
  && npm ci --omit=dev --no-audit --no-fund --ignore-scripts --silent)

# 6) Manifest: copy then sync version from package.json so the two can't drift.
echo "  · Writing manifest.json with version ${PKG_VERSION}…"
node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('$MANIFEST_SRC', 'utf8'));
  m.version = '$PKG_VERSION';
  fs.writeFileSync('$STAGING_DIR/manifest.json', JSON.stringify(m, null, 2) + '\n');
"

# 7) Icon
if [ -f "$ICON_SRC" ]; then
  echo "  · Copying icon from docs/assets/logo-512.png…"
  cp "$ICON_SRC" "$STAGING_DIR/icon.png"
else
  echo "  · ⚠  $ICON_SRC not found — bundle will ship without an icon."
fi

# 8) Validate manifest before packing (fails fast if schema changed)
echo "  · Validating manifest…"
npx mcpb validate "$STAGING_DIR/manifest.json"

# 9) Pack
echo "  · Packing…"
npx mcpb pack "$STAGING_DIR" "$OUTPUT_MCPB"

# 10) Report
BYTES=$(stat -f%z "$OUTPUT_MCPB" 2>/dev/null || stat -c%s "$OUTPUT_MCPB" 2>/dev/null)
echo ""
echo "✅ Built $OUTPUT_MCPB ($(( BYTES / 1024 )) KB)"
echo ""
npx mcpb info "$OUTPUT_MCPB"
