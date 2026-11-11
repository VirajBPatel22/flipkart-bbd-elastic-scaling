# Production Dockerfile for Flipkart BBD Elastic Scaling Backend API
# Uses lightweight official Node.js Alpine base image
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Ensure production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy package manifests first for optimal layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Expose backend service port
EXPOSE 5000

# Run as built-in non-root user (node, uid 1000) for container security
USER node

# Healthcheck to verify container health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the Node.js production server
CMD ["node", "src/server.js"]
