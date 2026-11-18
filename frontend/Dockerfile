FROM node:22-alpine AS builder

WORKDIR /app


COPY package*.json ./


RUN npm ci


COPY . .


ARG VITE_API_BASE_URL=""
ARG VITE_DASHBOARD_URL="http://localhost:5174"

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL


RUN npm run build


FROM nginx:alpine


COPY --from=builder /app/dist /usr/share/nginx/html


COPY nginx.conf /etc/nginx/conf.d/default.conf


EXPOSE 80


HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
