# Build from the repo root: docker build -f worker/Dockerfile -t atlas-worker .
# Matches the installed playwright version (package-lock: playwright 1.59.1).
FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Full install: the worker uses packages listed as devDependencies (@anthropic-ai/sdk, playwright, dotenv).
RUN npm ci --no-audit --no-fund && npm cache clean --force

COPY worker ./worker

USER pwuser
CMD ["node", "worker/index.js"]
