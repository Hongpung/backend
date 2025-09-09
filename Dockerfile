# 호스트에서 이미지 빌드 전 (Docker 안에서 nest build 하지 않음 — OOM 방지):
#   npm ci
#   npx prisma generate
#   npm run build
#   docker compose build app

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# prisma CLI(devDependency) 없이 호스트에서 generate 한 결과만 복사
COPY node_modules/.prisma ./node_modules/.prisma
COPY dist ./dist

RUN test -f dist/src/main.js || (echo "dist 없음 — 호스트에서 npm run build 실행" >&2 && exit 1)

EXPOSE 8080
# .env는 .dockerignore로 이미지에 포함하지 않음 → compose env_file 또는 docker run --env-file
CMD ["node", "/app/dist/src/main.js"]

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
