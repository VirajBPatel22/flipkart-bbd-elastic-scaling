# Storefront and monitoring controls

The storefront bundles illustrative category photography, with local SVG fallbacks.
Catalogue prices and stock remain API data. Photos represent categories rather than
exact fictional product models; source URLs are in frontend/public/products/CREDITS.txt.

The dashboard supports refresh intervals, time windows, pause/resume and hover
values with snapshot timestamps. AWS metrics still arrive at CloudWatch frequency;
refreshing the browser does not fabricate extra metric samples. Missing values
remain unavailable. History and current test state reset when monitoring restarts.

## API test

Start test sends read-only GET /api/instance requests through the load balancer.
Settings are bounded to 1–5 requests/second and 10–60 seconds. The UI shows actual
completions, successes, failures and latency samples. Stop cancels further batches;
in-flight requests have a three-second timeout. One test runs at a time. These
probes measure API response health, not a CPU-throughput benchmark.

## CPU scaling test (AWS)

The separate button requires an explicit acknowledgement of billable extra AWS
capacity. It requires one healthy backend and maximum two. A fixed SSM document
starts two CPU processes for six minutes under a 390-second systemd bound. The
monitoring role can invoke only this document on backend-tagged instances; it has
no arbitrary shell-command endpoint or desired-capacity write permission.

The observer reports completed high-alarm policy activities, two healthy targets
and completed low-alarm policy activities. The low alarm requires fifteen minutes
of low samples; this test may take about 25 minutes. Stop submits the document's
fixed stop action. Watch the live charts afterward for automatic recovery.

The dashboard must be opened through its authenticated SSM tunnel. Public ALB
paths to dashboard/test controls remain denied. Test requests require a custom
header, and browser starts must originate from the dashboard host. Do not expose
monitoring-api directly to the Internet. Current test data are operational UI
samples, not persisted k6 comparison results.

## Deployment verification (9 November 2026)

UI application images use release 520df7c84712. The deployed dashboard config
references the fixed SSM document; its IAM policy permits only start/stop on
backend-tagged instances. The live API probe completed 10/10 successful requests.
The CPU Start endpoint submitted its fixed command and Stop ended the load;
subsequent inspection found the systemd unit inactive, no Python workers, and
compute disabled. This is a Start/Stop smoke check, not a second full 25-minute
automatic-cycle experiment. The earlier published automatic-cycle evidence
remains the separate policy verification.

Local browser verification also completed 20/20 API probes and displayed measured
latency with an observed timestamp on hover. All 14 storefront image elements
loaded (hero plus product images). The final live Terraform plan reported no
changes. Image scan applicability is documented in UI_IMAGE_SCAN_REVIEW.md.
