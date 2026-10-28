# syntax=docker/dockerfile:1

# ---- frontend: React 18 + Vite, built with the pnpm version the repo pins ----
FROM node:22-slim AS web
WORKDIR /build
RUN corepack enable
COPY academic-paper-explorer/package.json academic-paper-explorer/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY academic-paper-explorer/ ./
# Serving from a sub-path? docker build --build-arg VITE_BASE=/papers/
ARG VITE_BASE=/
ENV VITE_BASE=${VITE_BASE}
RUN pnpm build

# ---- runtime: one Bun process serving the API, the static build and SQLite ----
FROM oven/bun:1.4-slim
WORKDIR /app

ENV PORT=8787 \
    HOST=0.0.0.0 \
    DB_PATH=/data/app.db \
    PAPER_CONTENT_MODE=off

# PAPER_CONTENT_MODE is `off` here on purpose. A container binds 0.0.0.0, so
# other people may be able to reach it, and arXiv's terms of use only allow
# storing and serving e-print content "for your own personal use, or for research
# purposes". If this instance is in fact yours alone, set it to `full` and the
# in-app reader gets the whole paper instead of the abstract and a link.
# See https://info.arxiv.org/help/api/tou.html

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY server/ ./server/
COPY --from=web /build/dist ./academic-paper-explorer/dist

RUN mkdir -p /data && chown -R bun:bun /data /app
USER bun
VOLUME ["/data"]
EXPOSE 8787

# Any HTTP answer means the process is up; 401 just means a token is configured.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/llm/status').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

# Not `bun run server`: that script reads server/.env, which does not exist here.
# Configuration comes from the container environment instead.
CMD ["bun", "run", "server/main.ts"]
