# Stage 1: Build the React/Vite storefront
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for Vite build)
RUN npm ci

# Copy application source
COPY . .

# Build-time environment arguments (defaults to same-origin relative API path)
ARG VITE_API_BASE_URL=""
ARG VITE_DASHBOARD_URL="http://localhost:5174"

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL

# Build production bundle to /app/dist
RUN npm run build

# Stage 2: Serve production bundle with Nginx
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check using lightweight curl/wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
