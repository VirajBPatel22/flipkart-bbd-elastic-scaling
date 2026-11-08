#!/usr/bin/env bash
set -Eeuo pipefail
: "${AWS_REGION:?Set AWS_REGION}"
for command in aws docker python3; do command -v "$command" >/dev/null; done
aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output table
aws ec2 describe-availability-zones --region "$AWS_REGION" --query 'AvailabilityZones[?State==`available`].ZoneName' --output table
docker info --format '{{.ServerVersion}}'
echo 'Read-only checks passed. IAM permissions, quotas, instance availability, DNS/certificate, budget and SSM schemas still need operator review.'
