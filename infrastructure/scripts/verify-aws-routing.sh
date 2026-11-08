#!/usr/bin/env bash
# Local integration of the actual AWS dashboard Nginx config. No AWS requests.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
mkdir -p infrastructure/validation
test_dir="$PWD/infrastructure/validation"
password=local-routing-fixture-only
printf '%s\n' "$password" | openssl passwd -6 -stdin | sed 's/^/fixture:/' > "$test_dir/route-test.htpasswd"
sed 's@http://127.0.0.1:5001/@http://monitoring-api:5001/@' infrastructure/aws/dashboard.conf > "$test_dir/route-test.conf"
name="bbd-aws-route-check-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$name" --network flipkart-bbd-elastic-scaling_default \
  -p 127.0.0.1:18081:80 \
  -v "$test_dir/route-test.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$test_dir/route-test.htpasswd:/etc/nginx/bbd.htpasswd:ro" \
  flipkart-bbd-elastic-scaling-dashboard-frontend >/dev/null
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:18081/healthz >/dev/null 2>&1; then break; fi
  sleep 1
done
[[ $(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/dashboard/) == 401 ]]
[[ $(curl -sS -u fixture:wrong -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/dashboard/) == 401 ]]
curl -fsS -u "fixture:$password" http://127.0.0.1:18081/dashboard/ > "$test_dir/aws-dashboard.html"
curl -fsS -u "fixture:$password" http://127.0.0.1:18081/dashboard/refreshed-route > /dev/null
curl -fsS -u "fixture:$password" http://127.0.0.1:18081/monitoring-api/api/health >/dev/null
python3 - "$test_dir/aws-dashboard.html" <<'PY'
import pathlib,re,subprocess,sys
html=pathlib.Path(sys.argv[1]).read_text()
assert '<div id="root">' in html
for asset in re.findall(r'(?:src|href)="([^"]+\.(?:js|css))"',html):
    subprocess.run(['curl','-fsS','-u','fixture:local-routing-fixture-only','http://127.0.0.1:18081'+asset],stdout=subprocess.DEVNULL,check=True)
PY
echo 'AWS Nginx verified locally: health, authentication, SPA refresh, assets and monitoring prefix.'
