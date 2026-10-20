# IT457 Engineering Guide: Load Testing with k6 & Locust
**Focus:** Open-Model Workload Generation, Script Blueprints, Threshold Assertions & Metrics Pipelines  
**Course:** IT457 - Cloud Computing  
**Document Code:** `research/08-load-testing-k6-locust.md`  

---

## 1. Workload Modeling: Why k6 Open-Model Arrival Rate is Mandatory

Standard benchmarking tools (ApacheBench, default Locust) operate on a **closed model**, where a fixed number of Virtual Users (VUs) execute in a loop: `Request -> Wait for Response -> Sleep -> Repeat`.

As proven in **[A06]**, when a system under test degrades under load:
1. In a **closed model**, the client waits longer for responses, automatically throttling its request generation rate. The system appears stable because the offered load drops!
2. In the real world (an e-commerce flash sale), users arrive independently according to an arrival process $\lambda(t)$. Slower responses do not stop new users from arriving; instead, requests pile up in queues.
3. An **open model** (implemented via k6's `constant-arrival-rate` and `ramping-arrival-rate` executors) decouples request generation from server response times, accurately stressing the backend and measuring true queueing delay.

---

## 2. Production-Ready k6 Test Scripts

### 2.1 Smoke Test Script (`loadtest/k6/smoke.js`)

Used to verify network connectivity, ALB routing, and endpoint validity prior to running heavy experiments:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate==0'],       // 100% success required
    http_req_duration: ['p(95)<200'],   // 95% under 200ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'healthy status': (r) => JSON.parse(r.body).status === 'healthy',
  });
  sleep(1);
}
```

### 2.2 Experiment 1: Static Capacity Sweep (`loadtest/k6/e1-static.js`)

Applies a constant arrival rate of 250 requests per second for 5 minutes to evaluate fixed-instance capacity:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 250,                          // 250 target requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,               // Dedicated pool of worker threads
      maxVUs: 300,                        // Burst ceiling if server stalls
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],       // Error rate under 2%
    http_req_duration: ['p(95)<400'],     // p95 latency under 400ms
    dropped_iterations: ['count==0'],    // Proves client was not starved
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

export default function () {
  // Heavy CPU-bound endpoint simulating checkout crypto calculation
  const res = http.get(`${BASE_URL}/work?n=5000`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

### 2.3 Experiment 2: Dynamic Flash-Sale Autoscaling Ramp (`loadtest/k6/e2-ramp.js`)

Simulates a multi-phase flash-sale traffic surge to evaluate target-tracking autoscaling lag:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    flash_sale_surge: {
      executor: 'ramping-arrival-rate',
      startRate: 50,                      // Baseline pre-sale traffic (50 req/s)
      timeUnit: '1s',
      preAllocatedVUs: 150,
      maxVUs: 600,
      stages: [
        { target: 50,  duration: '2m' },  // Baseline steady state
        { target: 450, duration: '2m' },  // Rapid flash-sale surge (9x ramp)
        { target: 450, duration: '4m' },  // Sustained peak sale
        { target: 50,  duration: '1m' },  // Sudden drop post-sale
        { target: 50,  duration: '3m' },  // Cool-down observation window
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],       // Max 5% errors during scaling spike
    dropped_iterations: ['count==0'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

export default function () {
  const res = http.get(`${BASE_URL}/work?n=5000`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

---

## 3. Alternative Python Implementation: Locust (`loadtest/locust/locustfile.py`)

For students requiring a pure Python framework, Locust with `FastHttpUser` (gevent-backed HTTP client) provides high-performance testing:

```python
from locust import task, between
from locust.contrib.fasthttp import FastHttpUser
import json

class EcommerceLoadUser(FastHttpUser):
    # Short wait time between requests
    wait_time = between(0.1, 0.3)

    @task(5)
    def test_checkout_work(self):
        with self.client.get("/work?n=5000", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed with HTTP {response.status_code}")

    @task(1)
    def test_health(self):
        self.client.get("/health")
```

Execution command:
```bash
locust -f loadtest/locust/locustfile.py --headless -u 200 -r 20 --run-time 10m --host "http://YOUR-ALB-DNS-NAME" --csv results/raw/locust_e2
```

---

## 4. Execution Pipeline & Metric Export

To ensure reproducibility across all experimental runs, execute k6 using explicit JSON and CSV export flags:

```bash
# 1. Run Experiment 1 across N = 1 to 5 instances
for N in 1 2 3 4 5; do
  echo ">>> Running E1 for N=$N instances..."
  k6 run \
    -e TARGET_URL="http://$ALB_DNS" \
    --summary-export="results/raw/e1_N${N}_summary.json" \
    --out csv="results/raw/e1_N${N}_timeseries.csv" \
    loadtest/k6/e1-static.js
done

# 2. Run Experiment 2 (Autoscaling Ramp)
k6 run \
  -e TARGET_URL="http://$ALB_DNS" \
  --summary-export="results/raw/e2_ramp_summary.json" \
  --out csv="results/raw/e2_ramp_timeseries.csv" \
  loadtest/k6/e2-ramp.js
```

### 4.1 Client Load-Generator Health Checklist
Before accepting benchmark data into the final report:
* [ ] Verify that `dropped_iterations` in k6 summary output is strictly **0**. If $>0$, the test client CPU was saturated, which invalidates the results.
* [ ] Monitor load-generator laptop/host CPU: ensure total host CPU stays below $65\%$ during the entire run.
* [ ] Increase OS open file descriptor limits: `ulimit -n 65535`.
