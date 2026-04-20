FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first to maximize layer cache reuse.
COPY package*.json ./
RUN npm ci

# Build static site.
COPY . .
RUN npm run build

FROM nginx:alpine AS runner

# Use a tuned static-site nginx config.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Serve the generated static files.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]