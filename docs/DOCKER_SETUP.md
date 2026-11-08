# Local Docker system (WSL2)



Run from the existing checkout; do not clone or move it:



```bash

cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling

docker version

docker info

docker compose version

docker run --rm hello-world

docker compose config --quiet

docker compose up --build -d

docker compose ps

docker compose logs --tail=100

```



Windows path: `C:\Users\okpat\Desktop\flipkart-bbd-elastic-scaling`.

WSL2 Ubuntu and its Docker Engine must be running. Docker Desktop is optional when

Docker Engine is installed inside WSL. Use `sudo systemctl start docker` if that

engine is stopped. `/mnt/c` builds may be slower; no working copy is relocated.



Keep the existing `backend/.env`. It is loaded at runtime and excluded from build

contexts and Git. Configure `DATABASE_URL` with the existing Supabase PostgreSQL

connection string (legacy `SUPABASE_URL` is accepted). No migration or seed is

needed for an existing catalogue. Configure a private `LOAD_TEST_TOKEN`; there is

no fallback token. Generate one with `openssl rand -hex 32` if missing and place

it only in backend/.env. Never put it in a VITE variable. Compute can be disabled

with `ENABLE_DEMO_COMPUTE=false`. Missing database configuration leaves liveness

healthy but causes product API errors; verify products separately.



Only the gateway publishes a port, bound to loopback. Port 8081 is the default

because a pre-existing Windows Apache listener occupied 8080 during verification.

Override with `GATEWAY_PORT=8080 docker compose up -d gateway` only if that port is

free; set `BASE_URL=http://localhost:8080` for the experiment runner in that case.

The k6 container uses the internal gateway port independently.



Routes:



| URL | Function |

|---|---|

| http://localhost:8081/ | Storefront |

| http://localhost:8081/api/health | Backend liveness |

| http://localhost:8081/api/products | Existing Supabase catalogue |

| http://localhost:8081/api/instance | Responding backend identity |

| http://localhost:8081/dashboard/ | Monitoring UI |

| http://localhost:8081/monitoring-api/api/overview | Real measurements |

| http://localhost:8081/monitoring-api/api/experiments | Saved JSON summaries |

| http://localhost:8081/monitoring-api/api/experiments.csv | CSV export |



```bash

docker compose up -d --scale backend=1

docker compose up -d --scale backend=2

docker compose up -d --scale backend=3

# Allow DNS refresh (2 seconds) and container health checks (up to 60 seconds).

for i in $(seq 1 24); do curl -fsS http://localhost:8081/api/instance; echo; done

docker compose up -d --scale backend=1

docker compose build

docker compose up -d

docker compose down

```



This is manual local horizontal scaling. It is not EC2 Auto Scaling. Nginx 1.28

uses an upstream shared zone and Docker DNS with `resolve`; new addresses are

discovered without reload. Failed backends are temporarily excluded by passive

failure detection; this is not active health checking. Docker health checks feed

monitoring, but Nginx does not consume Docker health status. Existing in-flight

requests can fail during abrupt scale-down. Compute POST requests are not retried.



Do not add `-v` to shutdown commands. No database is hosted in Compose. Never use

`docker system prune` to troubleshoot this project; unrelated containers may exist.

Check gateway logs for 502s, `docker compose ps` for health, and backend logs for

database connectivity. A missing token gives 401; disabled compute gives 403;

compute capacity returns 429. After changing backend/.env, recreate backends with

`docker compose up -d --force-recreate backend`.



## Keeping WSL available for the browser



Keep a WSL terminal open during the demo. On this host the distribution stopped

between short-lived Windows commands despite systemd Docker services. A temporary

hidden `wsl.exe --exec tail -f /dev/null` helper was started for verification

(Windows PID 18144). It changes no service configuration. After stopping this

project, stop that helper from PowerShell with `Stop-Process -Id 18144` if it still

belongs to that wsl.exe process. Do not terminate unrelated WSL processes. Opening

an ordinary WSL terminal is the recommended way to keep a later demo session alive.


## Database TLS

Verified TLS is now the backend default. Local Compose explicitly defaults
LOCAL_DB_TLS_VERIFY=false for compatibility with the existing local CA setup.
For verified local TLS provide the correct CA as DATABASE_CA_BASE64 in backend/.env
(or use a server certificate trusted by Node), then start with:
`LOCAL_DB_TLS_VERIFY=true docker compose up -d --force-recreate backend`.
AWS startup requires verified TLS. `/api/ready` checks DB connectivity separately.
