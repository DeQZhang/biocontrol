FROM golang:1.25-alpine AS backend-builder

WORKDIR /workspace

ENV GOPROXY=https://goproxy.cn,direct

COPY go.mod go.sum ./
RUN go mod download

COPY backend/ ./backend/
COPY conf/ ./conf/
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/biocontrol .


FROM alpine:3.21

WORKDIR /app

RUN addgroup -S biocontrol \
  && adduser -S -G biocontrol biocontrol \
  && apk add --no-cache tzdata \
  && mkdir -p /app/conf \
  && chown -R biocontrol:biocontrol /app

COPY --from=backend-builder /out/biocontrol /app/biocontrol
COPY --from=backend-builder /workspace/conf /app/conf

ENV TZ=Asia/Shanghai
ENV BIOCONTROL_HTTP_ADDR=0.0.0.0
ENV BIOCONTROL_HTTP_PORT=8080
ENV BIOCONTROL_DB_HOST=mysql
ENV BIOCONTROL_DB_PORT=3306
ENV BIOCONTROL_DB_NAME=biocontrol
ENV BIOCONTROL_DB_USER=biocontrol
ENV BIOCONTROL_SERVE_SPA=false
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${BIOCONTROL_HTTP_PORT}/api/health >/dev/null || exit 1

USER biocontrol

CMD ["/app/biocontrol"]
