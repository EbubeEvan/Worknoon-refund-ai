FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Production dependencies only.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# SQL migrations, applied on every boot.
COPY drizzle ./drizzle
# The seeded policy markdown is read once at seed time, then persisted to Postgres.
# The running app never reads from disk - it always loads policy text from the DB.
COPY seed ./seed
EXPOSE 4000
USER node
CMD ["node", "dist/server.js"]
