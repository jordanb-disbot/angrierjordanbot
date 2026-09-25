# syntax=docker/dockerfile:1
# Build context must be angrier_jordan_precode_construction_pack_v1, never its parent.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm install --global npm@11.6.0 && npm ci --include=dev && npm run build
# Railway exposes this non-secret build variable; CI supplies it explicitly.
ARG RAILWAY_GIT_COMMIT_SHA
RUN node --input-type=module -e "import fs from 'node:fs'; const sha=process.env.RAILWAY_GIT_COMMIT_SHA; if(!/^[a-f0-9]{40}$/i.test(sha??'')) throw Error('A full release commit SHA is required'); fs.writeFileSync('RELEASE_SHA',sha+'\n')"

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080
# Keep workspace dependencies, including the Prisma migration CLI. Pruning dev
# dependencies would currently remove that CLI from the database workspace.
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "dist/apps/bot/src/index.js"]
