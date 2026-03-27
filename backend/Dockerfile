# ─── Stage: base ─────────────────────────────────────────────────────────────
FROM node:20-bullseye-slim AS base
WORKDIR /app
# Accept proxy settings as build args (used in environments that require a proxy)
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
COPY package*.json ./

# ─── Stage: development ───────────────────────────────────────────────────────
FROM base AS development
RUN if [ -n "$HTTPS_PROXY" ]; then \
      npm config set proxy "$HTTP_PROXY" && \
      npm config set https-proxy "$HTTPS_PROXY" && \
      npm config set strict-ssl false; \
    fi && NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ─── Stage: build ─────────────────────────────────────────────────────────────
FROM base AS build
RUN if [ -n "$HTTPS_PROXY" ]; then \
      npm config set proxy "$HTTP_PROXY" && \
      npm config set https-proxy "$HTTPS_PROXY" && \
      npm config set strict-ssl false; \
    fi && NODE_TLS_REJECT_UNAUTHORIZED=0 npm ci
COPY . .
RUN npm run build

# ─── Stage: production ────────────────────────────────────────────────────────
FROM node:20-bullseye-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
