# Infrastructure

- terraform/: AWS teaching deployment and offline mock-provider tests.
- aws/: EC2 startup helper, cloud-init template and authenticated dashboard Nginx.
- scripts/: validation, release audit, account preflight, manual ECR publishing,
  SSM secret setup and dashboard result upload.
- collector/ and nginx/: existing local-only Docker metrics/gateway.
- tests/: offline bootstrap and experiment-restoration tests.

Follow [AWS manual setup](../docs/AWS_MANUAL_SETUP.md). No automatic Terraform
apply or cloud-account writes occur during local validation.
