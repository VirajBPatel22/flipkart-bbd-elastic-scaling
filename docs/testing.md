# Testing

Run `npm test --prefix backend`, `npm run build:frontend` and
`npm run build:dashboard-frontend` from the repository root.

See [Docker integration](DOCKER_SETUP.md), [safe k6 experiments](LOAD_TESTING.md),
and [actual verification evidence](LOCAL_VERIFICATION.md). Backend tests include
mocked catalogue queries, parameter validation, protected worker-thread compute,
identity, health and HTTP metrics. An unconfigured-database test is skipped when
an existing database connection is present; a live product request is a separate
integration check. No seed or migration is required.

## AWS preparation checks

Run `npm test --prefix dashboard/monitoring-api` for injected offline AWS fixtures.
Run `python -m unittest discover -s infrastructure/tests -p test_*.py` for startup
and ASG-restoration logic, and `bash infrastructure/scripts/validate-local.sh`
in WSL for Terraform fmt/init/validate/mock tests. With Compose running, run
`bash infrastructure/scripts/verify-aws-routing.sh` for the actual AWS dashboard
Nginx configuration. CI mirrors source tests/builds/offline infrastructure checks;
no AWS credentials or deployment actions are part of CI.
