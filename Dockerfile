FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
# 빌드 시 Node heap 제한 (저사양: 1GB RAM + 1GB 스왑 환경용)
RUN NODE_OPTIONS=--max-old-space-size=2048 npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# prisma CLI 없이 생성된 client만 복사
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/main.js"]

# ------------------------------------------------------------------------------
# Prometheus (envsubst로 설정 치환 후 실행). 빌드: docker build --target prometheus -t hongpung-prometheus .
# ------------------------------------------------------------------------------
FROM prom/prometheus:v2.52.0 AS prom
FROM alpine:3.19 AS prometheus
RUN apk add --no-cache gettext
COPY --from=prom /bin/prometheus /bin/prometheus
COPY scripts/prometheus-entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod 755 /entrypoint.sh
USER nobody
EXPOSE 9090
VOLUME [ "/prometheus" ]
ENTRYPOINT [ "/entrypoint.sh" ]