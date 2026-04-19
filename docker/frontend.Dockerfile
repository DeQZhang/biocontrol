FROM node:22-alpine AS frontend-builder

WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN rm -f package-lock.json \
  && npm install --no-audit --no-fund

COPY frontend/ ./
RUN npm run build


FROM nginx:1.27-alpine

RUN apk add --no-cache tzdata wget

COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /workspace/frontend/dist /usr/share/nginx/html

ENV TZ=Asia/Shanghai
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1