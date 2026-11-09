# Live automatic scaling proof

Collected 9 November 2026 in ap-south-1 from `bbd-it457-backend` using
`infrastructure/scripts/prove-auto-scaling.py`.

- `initial.json`: original group, policy and managed alarm configuration.
- `timeline.jsonl`: timestamped desired capacity, members, targets and alarm states.
- `activities.json`: AWS scaling activities, including their alarm/policy causes.
- `alarm-high-history.json`, `alarm-low-history.json`: actual alarm transition history.
- `fleet-cpu.json`: exported one-minute Average CPUUtilization samples for the ASG.
- `summary.json`: completed cycle flags and restored group/target state.
- `sha256.json`: SHA-256 checksums for the raw JSON/JSONL artifacts.

All three proof flags are true; manual capacity cleanup is false. Desired capacity
changed 1 → 2 due to the high CPU alarm and 2 → 1 due to the low CPU alarm. Two
healthy targets were observed between those events. The load was synthetic host
CPU work, not HTTP requests. Neither alarm thresholds nor evaluation periods were
shortened. The deployment maximum was set to 2 before starting to fit account quota.

Runner source corresponds to the initial implementation published in `43f43e1`.
Later source adds baseline-target checks and built-in CPU/final-target exports.
Those exports were collected separately for this completed run without changing
the measured activities or timeline. Earlier manual benchmark activities remain
in the raw activity export; only completed matching-alarm events after this test's
start count toward the proof.

The artifacts contain resource identifiers but no application secrets, decrypted
SSM parameter values, session credentials or tokens. Do not replace missing data
with invented samples or confuse observer polling time with exact AWS event time.
