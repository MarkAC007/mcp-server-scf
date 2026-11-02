# node:22-alpine — multi-arch index digest (amd64 + arm64 + arm).
# Re-pull via `docker manifest inspect node:22-alpine` to rotate.
FROM node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f

WORKDIR /app

COPY package*.json ./
# --ignore-scripts blocks postinstall/preinstall supply-chain execution.
# --omit=dev replaces the deprecated --production flag.
RUN npm ci --omit=dev --ignore-scripts

COPY build/ ./build/
# Files copied from a checkout with restrictive modes (0600) must stay readable
# when the container runs as the unprivileged `node` user.
RUN chmod -R a+rX /app

# Default: stdio transport (unchanged). For the hosted Streamable HTTP transport
# run the image with `build/http.js` as the command, e.g.
#   docker run -e SCF_API_URL=https://scf.example -e MCP_HTTP_HOST=0.0.0.0 <image> build/http.js
ENTRYPOINT ["node"]
CMD ["build/index.js"]
