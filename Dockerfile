# node:22-alpine — multi-arch index digest (amd64 + arm64 + arm).
# Re-pull via `docker manifest inspect node:22-alpine` to rotate.
FROM node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f

WORKDIR /app

COPY package*.json ./
# --ignore-scripts blocks postinstall/preinstall supply-chain execution.
# --omit=dev replaces the deprecated --production flag.
RUN npm ci --omit=dev --ignore-scripts

COPY build/ ./build/

ENTRYPOINT ["node", "build/index.js"]
