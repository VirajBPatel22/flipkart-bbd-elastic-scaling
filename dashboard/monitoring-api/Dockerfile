# Production Dockerfile for Flipkart BBD Monitoring API
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Expose monitoring API port
EXPOSE 5001

# Run as built-in non-root user for security
USER node

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start the Express server
CMD ["node", "src/server.js"]
