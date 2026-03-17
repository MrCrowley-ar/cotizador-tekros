# ─── Stage: base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Stage: development ───────────────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── Stage: build ─────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage: production ────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
