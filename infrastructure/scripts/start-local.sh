#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/../.."

for command in docker; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker Engine is not reachable. Start Docker (e.g. 'sudo systemctl start docker' in WSL) and retry." >&2
  exit 1
fi

if [ ! -f backend/.env ]; then
  echo "Warning: backend/.env is missing. The storefront API will stay up but product/DB" >&2
  echo "endpoints will error until DATABASE_URL and LOAD_TEST_TOKEN are configured there." >&2
fi

PORT="${GATEWAY_PORT:-8081}"

echo "Building images and starting the stack (this can take a few minutes on first run)..."
docker compose up --build -d --wait --wait-timeout 180

docker compose ps

cat <<EOF

================================================================
Local stack is up.

  Storefront          : http://localhost:${PORT}/
  Backend liveness     : http://localhost:${PORT}/api/health
  Monitoring dashboard : http://localhost:${PORT}/dashboard/
  Monitoring API       : http://localhost:${PORT}/monitoring-api/api/overview

Useful follow-ups:
  docker compose logs -f               # tail logs for everything
  docker compose ps                    # check container health
  docker compose up -d --scale backend=2   # add a second backend replica
  bash infrastructure/scripts/stop-local.sh   # stop everything
================================================================
EOF
