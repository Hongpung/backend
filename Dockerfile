# 빌드: docker compose build app
# prisma generate + nest build 는 builder 스테이지(Alpine) 안에서 실행

FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# generate 시 schema env() 검증용 더미 (DB 연결 없음)
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

RUN test -f dist/src/main.js || (echo "dist 없음 — docker build 실패" >&2 && exit 1)

EXPOSE 8080
# .env는 .dockerignore로 이미지에 포함하지 않음 → compose env_file 또는 docker run --env-file
CMD ["node", "/app/dist/src/main.js"]

# ------------------------------------------------------------------------------
# Prisma Studio (운영 DB 디버그용, compose --profile tools). 빌드: docker build --target studio -t hongpung-prisma-studio .
# ------------------------------------------------------------------------------
FROM node:22-alpine AS studio
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev && npm install prisma@6.19.3

COPY prisma ./prisma

# generate 시 schema env() 검증용 더미 (DB 연결 없음)
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"

RUN npx prisma generate

EXPOSE 5555

CMD ["npx", "prisma", "studio", "--schema=./prisma/schema.prisma", "--hostname=0.0.0.0", "--port=5555", "--browser", "none"]

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
