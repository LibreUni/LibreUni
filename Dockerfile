FROM node:20 AS builder

ARG APP=main

WORKDIR /app

# Install Python and scientific libraries required for rendering build-time diagrams
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-matplotlib \
    python3-numpy \
    python3-pandas \
    && rm -rf /var/lib/apt/lists/*

# Install workspace dependencies first to maximize layer cache reuse.
COPY package*.json ./
COPY apps/main/package.json apps/main/package.json
RUN npm ci

# Install Playwright Chromium and its system dependencies
RUN npx playwright install --with-deps chromium

# Build the selected app from the monorepo.
COPY . .
RUN APP=${APP} npm run build

FROM nginx:alpine AS runner

ARG APP=main

# Use a tuned static-site nginx config.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Serve the generated static files for the selected app.
COPY --from=builder /app/apps/${APP}/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
