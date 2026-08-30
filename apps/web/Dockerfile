FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY apps/web apps/web
RUN pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone /repo
COPY --from=build /repo/apps/web/.next/static /repo/apps/web/.next/static
COPY --from=build /repo/apps/web/public /repo/apps/web/public

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
