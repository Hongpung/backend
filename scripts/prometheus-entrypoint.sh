#!/bin/sh
# 컨테이너 시작 시 템플릿에 환경변수 치환 후 Prometheus 실행
set -e
envsubst '${ENV_METRICS_USERNAME} ${ENV_METRICS_PASSWORD} ${ENV_SCRAPE_TARGET}' \
  < /etc/prometheus/prometheus.yml.template \
  > /tmp/prometheus.yml
exec /bin/prometheus \
  --config.file=/tmp/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.enable-lifecycle
