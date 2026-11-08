# Cost Management (Not Yet Implemented)

> This document is a placeholder for the later implementation stage, once
> AWS resources actually exist.

No AWS resources have been provisioned as part of this initial setup, so
there is no live spend to report yet.

For prior cost/TCO research used to plan this project, see
`docs/04-cost-tco.md` and the AWS Academy Learner Lab budget notes in
`docs/09-aws-learner-lab-playbook.md` (e.g. the $100 non-replenishable
budget and 4-hour session constraints).

Once infrastructure is deployed, this document will track:

- Instance types and counts used during load testing.
- Estimated hourly cost of the ALB + Auto Scaling Group at min/max capacity.
- A running log of actual spend against the Learner Lab budget.
- Teardown/cleanup steps to stop billing after experiments.
