FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# this must be a build ARG (not a runtime `environment:` var on the
# `web` service in docker-compose.yml) - a runtime-only value would leave
# `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` undefined in the
# already-built bundle, silently skipping loadStripe() (see pay-form.tsx).
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
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
