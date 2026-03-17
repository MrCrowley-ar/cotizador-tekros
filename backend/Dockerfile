# ─── Stage: base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Stage: development ───────────────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ─── Stage: build ─────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage: production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
