# Dashboard measurements and timestamps

All timestamps rendered in the dashboard use Asia/Kolkata (IST), including chart axes, hover details, experiment rows, update times, and scaling events. JSON and CSV retain original UTC timestamps for reproducibility.

The monitoring image includes two verified AWS fixed-capacity k6 summaries from 9 November 2026. Their source is `infrastructure/validation/final-evidence/fixed-results.json`; run identifiers are preserved in `dashboard/monitoring-api/src/data/verified-experiments.json`. Verified fixed capacity takes precedence over raw summaries with the same identifier. Both runs used 4 offered requests/second, 100,000 compute iterations and 30 seconds. The one-backend run had 24 failures among 120 requests; the two-backend run had no failures among 120. These short runs do not establish sustained production performance. They remain historical compute experiments even when compute is disabled in the current deployment.

CPU and memory were not aligned with these short experiments and remain null. The interface omits a comparison chart when that measurement was not collected. Live CloudWatch data is separate: absent request/latency data during idle or publication delay is never replaced by historical results or invented zeros.

Completed or stopped dashboard API probes with completed requests save actual request counts, latency and failure measurements. Fixed replica counts and CPU values are not inferred for these probes. AWS uses the host directory `/opt/bbd/test-results`, mounted writable at `/test-results`; results survive monitoring container restarts. Host files do not survive EC2 replacement. The two bundled verified runs remain available after replacement. Export CSV before replacing an instance to preserve additional dashboard runs.

API test graphs update immediately. AWS CloudWatch charts use completed minute buckets and can take additional minutes to publish. Start Test exercises the API; the separate CPU scaling button controls the bounded scaling experiment.
