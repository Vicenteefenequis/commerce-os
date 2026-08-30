# Shared image for the `backend` (Express HTTP) and `outbox-worker`
# services (design.md D9) - same build, different start command set in
# docker-compose.yml.
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/backend apps/backend
RUN pnpm --filter backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules /repo/node_modules
COPY --from=deps /repo/apps/backend/node_modules /repo/apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist /repo/apps/backend/dist
COPY --from=build /repo/apps/backend/migrations /repo/apps/backend/migrations
COPY apps/backend/package.json /repo/apps/backend/package.json

WORKDIR /repo/apps/backend
EXPOSE 4000
CMD ["node", "dist/http/server.js"]
