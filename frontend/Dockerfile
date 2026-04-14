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
# Remove the stock default.conf (listens on :80) so nothing falls back to it
# if template processing ever fails.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Cloud Run injects PORT=8080 at runtime; keep it as a safe default for local
# runs. NGINX_ENVSUBST_FILTER limits envsubst to PORT/BACKEND_URL so the
# official entrypoint doesn't clobber nginx's own variables ($uri, $host, ...).
ENV PORT=8080 \
    BACKEND_URL=http://localhost:3001 \
    NGINX_ENVSUBST_FILTER=^(PORT|BACKEND_URL)$
EXPOSE 8080
# Default CMD of the official image is ["nginx", "-g", "daemon off;"], which
# makes /docker-entrypoint.sh run /docker-entrypoint.d/20-envsubst-on-templates.sh
# (rendering /etc/nginx/templates/*.template into /etc/nginx/conf.d/) and then
# exec nginx as PID 1 with proper signal handling.
