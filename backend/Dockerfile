FROM node:22-alpine


WORKDIR /app


ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

EXPOSE 5000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
