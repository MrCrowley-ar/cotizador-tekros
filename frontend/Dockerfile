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
EXPOSE 3000
CMD ["npm", "run", "dev"]

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
FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
