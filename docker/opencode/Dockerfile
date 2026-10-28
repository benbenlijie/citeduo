# syntax=docker/dockerfile:1

# ---- fetch the opencode binary in a disposable stage ----
FROM oven/bun:1.3-slim AS opencode-bin
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN bun add -g opencode-ai@1.18.35
# The image sets BUN_INSTALL_BIN=/usr/local/bin (not /root/.bun/bin).
RUN cp -L /usr/local/bin/opencode /tmp/opencode && chmod 755 /tmp/opencode

# ---- runtime: non-root, read-only rootfs, only /runtime is writable ----
FROM oven/bun:1.3-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=opencode-bin /tmp/opencode /usr/local/bin/opencode

RUN groupadd -g 10001 opencode \
    && useradd -u 10001 -g opencode -d /runtime -s /usr/sbin/nologin opencode \
    && mkdir -p /app /runtime/.opencode \
    && chown -R 10001:10001 /app /runtime

COPY docker/opencode/prepare.ts /app/prepare.ts
COPY server/opencode-config.ts server/llm.ts server/errors.ts /app/
COPY docker/opencode/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 755 /usr/local/bin/entrypoint.sh

# Bake the tool SDK so the container never needs npm at runtime. The named
# runtime volume copies this directory on first use; prepare.ts rewrites the
# two tool files on every boot.
RUN cd /runtime/.opencode \
    && printf '%s\n' '{"dependencies":{"@opencode-ai/plugin":"1.18.33"}}' > package.json \
    && bun install \
    && chown -R 10001:10001 /runtime

USER 10001:10001
WORKDIR /runtime
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
