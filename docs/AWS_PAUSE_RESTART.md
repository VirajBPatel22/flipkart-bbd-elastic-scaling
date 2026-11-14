# Pause and restart the AWS demonstration

The runtime is paused through a reviewed Terraform plan targeting the project ALB, backend Auto Scaling Group and frontend/dashboard EC2 instances. Network settings, IAM, target groups and CloudWatch logs remain managed by Terraform. No automatic restart is scheduled.

Three experiment summaries were backed up privately in infrastructure/validation/shutdown-backup/experiments.json. Preserve this ignored local backup and Terraform state. Supabase, SSM secrets and ECR images are retained. Image and log storage may still incur small charges; previously incurred charges remain payable.

To restart later, open PowerShell in the repository and run:

```powershell
wsl python3 infrastructure/scripts/start-project.py
```

Docker Desktop with WSL integration and an authenticated it457-login profile are required. If authentication expired, run `wsl aws login --profile it457-login` first.

The command checks the account, updates the HTTP demo allowed IPv4 address, applies the pinned image manifest, waits for application readiness, restores backed-up API results and opens the dashboard tunnel. Keep the terminal open. The storefront URL and instance IDs can change. AWS charges resume when resources are created. Closing the tunnel does not pause AWS.

The restart script has been syntax-checked, not executed after shutdown, because AWS must remain paused. Before a later pause, export new results and review a new targeted destroy plan. Stopping an ASG member alone can trigger replacement. A whole-stack destroy also removes retained logs.
