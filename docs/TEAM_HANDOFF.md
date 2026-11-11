# Group 21 GitHub handoff

Use the [project repository](https://github.com/VirajBPatel22/flipkart-bbd-elastic-scaling) and the `main` branch. The existing code is the baseline. Each member should complete and review their assigned follow-up using their own GitHub identity. Record the actual changes, checks and commit hash. Keep Git's normal timestamps and follow the course rules for AI assistance.

## Submission order

Agree a start time in the group chat. Each slot begins once the previous member shares their commit on `main`. Treat the times as estimates and move the next slot if a check takes longer.

| Slot | Member | Student ID | Assignment |
| --- | --- | --- | --- |
| 1 · first 45 minutes | Virajkumar Patel | 202611047 | Infrastructure and setup runbooks |
| 2 · next 45 minutes | Neel Prajapati | 202611022 | Application and load-test reproducibility |
| 3 · final 45 minutes | Om Patel | 202611030 | Results, report evidence and integration |

## Before editing

Clone the repository or use your existing clone. The ZIP is a reference snapshot with the report and evidence in `submission-reference/`. Push from your Git clone.

~~~bash
git status --short
git switch main
git pull --ff-only origin main
git log -1 --oneline
git var GIT_AUTHOR_IDENT
~~~

If needed, set repository-local `user.name` and `user.email` to your own name and GitHub-verified email or GitHub noreply address. Confirm you have repository write access. If branch protection rejects a direct push, ask Viraj to coordinate the permitted route into `main`.

## Viraj · Infrastructure and CloudOps

Review the Compose and Terraform settings against the runbooks. Replace machine-specific paths in `docs/DOCKER_SETUP.md` with commands that work from a fresh checkout. Check the restart and shutdown procedures in `docs/AWS_PAUSE_RESTART.md`, including how to find the new URL and verify that the runtime is gone. Keep AWS paused until the team schedules a demonstration.

Run `docker compose config --quiet` and `bash infrastructure/scripts/validate-local.sh`. Record the checks and outcomes in the relevant runbook. Suggested commit message — `docs: make deployment steps reproducible from a fresh clone`.

## Neel · Application and load testing

Run the tests and builds in the root README. With an authorized database configured, use `docker compose up --build -d` and `python3 infrastructure/scripts/verify-local.py` to check the catalogue, filtering, API and dashboard. Inspect the product images and run a local dashboard probe. Check that timestamps display in IST and AWS experiment results are identified as historical.

Follow the local k6 instructions from a fresh checkout. Fix a concrete issue found or improve the instructions based on a reproducibility check. For new measurements, record the environment, request rate, duration, failures and dropped iterations. Suggested commit message — `docs: verify storefront and local load-test workflow`.

## Om · Research, cost and documentation

Check the report against the recorded fixed-capacity results, the November 9 CPU scaling proof and the November 11 HTTP load run. Add a reviewed evidence summary that links each measurement to its source and describes the limits of the comparison. Verify the integrated repository after both teammates' commits.

Record each member's actual contribution and the final `main` commit in the submission package. Retain the editable demonstration URL field. Keep private configuration, Terraform state and local build output out of Git. Suggested commit message — `docs: reconcile report results with AWS evidence`.

## Finish your slot

Stage your own files by name. Inspect the staged changes, then commit and push when the checks pass.

~~~bash
git diff --cached --check
git diff --cached
git commit -m "Describe the work you completed"
git push origin main
git log -1 --oneline
~~~

Share your commit link, tests and any remaining issue. The next member should pull `main` and confirm that commit before beginning. If the remote branch has moved, coordinate before reconciling it.
