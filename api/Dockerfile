# Build from the repo root: docker build -f api/Dockerfile -t firmward-api .
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# The API only needs runtime dependencies (@anthropic-ai/sdk, @supabase/supabase-js, mammoth).
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY site.config.js ./
COPY api ./api

USER node
EXPOSE 8787
CMD ["node", "api/index.js"]
