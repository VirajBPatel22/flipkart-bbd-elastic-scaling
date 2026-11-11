# Group 21 work schedule

This schedule divides the remaining implementation and integration work among the three members. The repository already contains a working project baseline. Each person should make and review a real change in their assigned area; the existing source should not be re-added under a different name or author.

## Commit sequence

Suggested slots below use India Standard Time (IST), based on the current date. Confirm the slots with the group. A checkpoint moves only after its owner has completed the change, run the listed checks, and shared the commit. If a task is not ready, move its slot; keep Git's actual author and timestamp and do not create placeholder or backdated commits.

| Checkpoint | Suggested slot | Owner | Work and evidence | Commit checkpoint |
| --- | --- | --- | --- | --- |
| 1 | Thu, Nov 12, 2026 · 7:00–8:00 PM IST | Virajkumar Patel · 202611047 | Add a deadline to the database readiness query, preserve the existing health and catalogue contracts, and cover successful, failed, and slow queries. Run `npm test --prefix backend`. | Commit the bounded readiness implementation and tests. |
| 2 | Fri, Nov 13, 2026 · 7:00–8:00 PM IST | Neel Prajapati · 202611022 | Persist storefront search and category filters in the URL, support browser back/forward, and preserve loading, error, retry, and empty states. Run `npm run build:frontend` and check a shared filter link. | Commit the URL-backed storefront filters. |
| 3 | Sat, Nov 14, 2026 · 7:00–8:00 PM IST | Om Patel · 202611030 | Let dashboard panels refresh independently so one failed metrics request does not hide healthy panels. Preserve IST display and identify the failed panel. Run dashboard tests and build. | Commit the independent dashboard refresh and its checks. |
| 4 | Sun, Nov 15, 2026 · 7:00–8:00 PM IST | Om Patel · 202611030, with group review | Integrate the three changes, run the documented local and offline infrastructure checks, and update the evidence index only with results actually observed. Keep AWS paused unless the group schedules and authorizes a demonstration. | Commit any real integration or documentation corrections and share the final commit hash. |

## Git workflow

1. Confirm or adjust the suggested calendar slots with the group. The schedule is for future work, not a request to manufacture commit history.
2. Each member checks out the latest `main`, confirms their Git author identity with `git var GIT_AUTHOR_IDENT`, and creates a short-lived feature branch under their own account.
3. Make the assigned change, run its checks, and inspect `git diff` before committing. Use a message that describes the actual change.
4. Open a pull request or push to `main` if repository permissions allow. Merge checkpoints in order and share the commit or pull request link with the group.
5. Record the actual implementation, test result, and any remaining limitation. Disclose AI assistance as required by the course.

## Suggested commit messages

- `fix(backend): bound database readiness checks`
- `feat(frontend): keep storefront filters in the URL`
- `fix(dashboard): refresh monitoring panels independently`
- `docs: record verified integration evidence`
