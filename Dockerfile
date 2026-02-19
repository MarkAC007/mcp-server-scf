FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY build/ ./build/

ENTRYPOINT ["node", "build/index.js"]
