# ---- Build & run the planner server (Next.js + Drizzle) ----
# Usage:  docker compose --env-file .env.production up -d --build     (see docker-compose.yml)

FROM node:22-alpine AS deps
WORKDIR /app
# package-lock.json is optional: `package*.json` copies it only when present.
COPY package*.json ./
# Use the lock file when available (reproducible), otherwise resolve fresh.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The DB module reads DATABASE_URL at import time; a placeholder is enough for `next build`.
ARG DATABASE_URL=postgresql://postgres:postgres@db:5432/app_db
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder /app ./
EXPOSE 3000
# Tables are created automatically on first request (src/db/bootstrap.ts).
CMD ["npm", "start"]
