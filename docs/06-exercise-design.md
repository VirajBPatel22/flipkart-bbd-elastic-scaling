# IT457 Hands-On Exercise Engineering Blueprint
**Assignment Theme:** Scalability & High-Traffic Events (Flipkart BBD Simulation)  
**Exercise Specification:** Deploy a web app behind an ALB with autoscaling, run k6 load tests, and plot response time against instance count.  
**Course:** IT457 - Cloud Computing  
**Document Code:** `research/06-exercise-design.md`  

---

## 1. System Architecture & Component Design

The experimental system translates enterprise flash-sale architecture into an elegant, fully automated cloud testbed designed specifically for AWS Academy Learner Lab:

```
                            ┌───────────────────────────────┐
                            │    k6 LOAD GENERATOR CLIENT   │
                            │   (Open-Model Arrival Rate)   │
                            └───────────────┬───────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │   APPLICATION LOAD BALANCER   │
                            │   (Internet-Facing, Multi-AZ) │
                            └───────┬───────────────┬───────┘
                                    │               │
                    ┌───────────────┘               └───────────────┐
                    ▼                                               ▼
        ┌───────────────────────┐                       ┌───────────────────────┐
        │ Public Subnet A (AZ1) │                       │ Public Subnet B (AZ2) │
        │                       │                       │                       │
        │ ┌───────────────────┐ │                       │ ┌───────────────────┐ │
        │ │ EC2 Instance 1    │ │                       │ │ EC2 Instance 2    │ │
        │ │ (Docker: FastAPI) │ │                       │ │ (Docker: FastAPI) │ │
        │ └───────────────────┘ │                       │ └───────────────────┘ │
        └───────────────────────┘                       └───────────────────────┘
                    ▲                                               ▲
                    └───────────────────────┬───────────────────────┘
                                            │ Managed by
                            ┌───────────────┴───────────────┐
                            │    AUTO SCALING GROUP (ASG)   │
                            │  (Min: 1, Max: 5, Target 50%) │
                            └───────────────▲───────────────┘
                                            │ Scaled via
                            ┌───────────────┴───────────────┐
                            │     CLOUDWATCH MONITORING     │
                            │ (ASGAverageCPUUtilization)    │
                            └───────────────────────────────┘
```

### 1.1 Application Layer Design (`app/main.py`)

A high-performance asynchronous application built on **FastAPI and Uvicorn**, packaged in Docker:
1. `GET /health`  
   * **Purpose:** Lightweight health check endpoint for ALB target group probes.
   * **Characteristics:** Zero database/compute overhead; returns instant HTTP `200 OK` with JSON `{"status": "healthy"}` in $<1$ ms.
2. `GET /work?n=N`  
   * **Purpose:** Controlled CPU-bound workload simulating cryptographic checkout hashing, inventory validation, and signature verification.
   * **Implementation:** Computes prime numbers up to $N$ (default $N=5,000$). Strictly consumes CPU without memory leak or heap exhaustion, ensuring predictable CPU metric reflection to CloudWatch.
3. `GET /`  
   * **Purpose:** Metadata inspection.
   * **Payload:** Returns the executing EC2 instance ID, local private IP, current timestamp, and container hostname to verify ALB load distribution across instances.

---

## 2. Infrastructure Specification (AWS Learner Lab Compliant)

| Component | AWS Resource | Technical Configuration | Graded Justification |
|:---|:---|:---|:---|
| **Virtual Private Cloud** | Amazon VPC | CIDR `10.0.0.0/16`, DNS Hostnames enabled | Isolated network perimeter avoiding IP collisions. |
| **Subnets** | Public Subnets (2 AZs) | Subnet 1: `10.0.1.0/24` (AZ A); Subnet 2: `10.0.2.0/24` (AZ B) | Mandatory ALB requirement: ALBs require at least two public subnets across distinct AZs. |
| **Ingress Proxy** | Application Load Balancer | Internet-facing, HTTP port 80 listener | Layer 7 routing, TLS termination ready, native Target Group health monitoring. |
| **Target Group** | Target Group (Instance) | Protocol HTTP:80, Path `/health`, Interval 15s, Healthy 2, Unhealthy 2 | Rapid 20-second failure detection; prevents traffic black-holing. |
| **Launch Template** | EC2 Launch Template | AMI: Ubuntu 24.04 LTS / Amazon Linux 2023, Type: `t2.micro` / `t3.micro` | Free-tier / Learner Lab eligible; 1 vCPU burstable compute. |
| **Auto Scaling Group** | Amazon EC2 ASG | Min: 1, Max: 5, Desired: 1, Default Warmup: 60s | Elastic dynamic bounds preventing Learner Lab vCPU quota exhaustion. |
| **Scaling Policy** | Target Tracking Policy | Metric: `ASGAverageCPUUtilization`, Target: 50.0% | Smooth proportional control loop mimicking enterprise flash-sale elasticity. |

---

## 3. Experimental Protocol & Testing Matrix

To generate rigorous, publishable data for the 10-page final report, we execute three formal experiments:

```
    ┌────────────────────────────────────────────────────────────────────────┐
    │                       EXPERIMENT SUITE (E1, E2, E3)                    │
    ├─────────────────────┬──────────────────────────┬───────────────────────┤
    │  E1: Static Sweep   │  E2: Autoscaling Ramp    │  E3: Chaos Invalidate │
    │  (Isolate Scale)    │  (Flash-Sale Lag Test)   │  (Self-Healing Test)  │
    │  N ∈ {1, 2, 3, 4, 5}│  50 ➔ 450 ➔ 50 req/s     │  N = 3, Terminate 1   │
    │  Plot: Latency vs N │  Plot: Time-Series Sync  │  Measure: MTTR & 502s │
    └─────────────────────┴──────────────────────────┴───────────────────────┘
```

### 3.1 Experiment 1 (E1): Static Capacity Sweep (Horizontal Scaling Isolation)
* **Objective:** **Directly fulfill the core course requirement: Plot response time against instance count.**
* **Methodology:** Disable dynamic autoscaling. Manually fix the ASG capacity to static values $N \in \{1, 2, 3, 4, 5\}$.
* **Workload:** Inject an identical, open-model workload of **250 req/s** for 5 minutes per instance setting using k6 `constant-arrival-rate`. Discard the first 60 seconds of each run as cache/warmup transient.
* **Repetitions:** 3 independent runs per instance count ($5 \times 3 = 15$ total test executions).
* **Expected Result:** Confirms Hypothesis **H1**: Latency drops sharply from $N=1$ to $N=3$ (queue clearance), and plateaus for $N \ge 3$ as capacity exceeds offered load.

### 3.2 Experiment 2 (E2): Dynamic Autoscaling Ramp (Flash-Sale Simulation)
* **Objective:** Measure the **Scaling Reaction Delay ($\tau_{\text{total}}$)** and capture instance scale-out vs latency trade-offs.
* **Methodology:** Enable Target Tracking at 50% CPU with Min=1, Max=5.
* **Workload Profile (12-minute BBD simulation):**
  * **Minutes 0–2 (Pre-Sale Baseline):** Constant 50 req/s (1 instance suffices).
  * **Minutes 2–4 (Flash-Sale Ramp):** Linear surge from 50 to 450 req/s.
  * **Minutes 4–8 (Peak Sustained Sale):** Sustained 450 req/s.
  * **Minutes 8–12 (Post-Sale Wind-Down):** Step-down to 50 req/s (observe cooldown & scale-in).
* **Deliverable:** Dual-axis time-series plot (**Figure F6**) plotting Request Rate, Running Instance Count, CPU Utilization, and $p_{95}$ Latency on a synchronized time axis.

### 3.3 Experiment 3 (E3): Chaos Resilience & Node Failure Recovery
* **Objective:** Measure the Mean Time to Detect (MTTD) and Mean Time to Recover (MTTR) under abrupt node termination.
* **Methodology:** Apply a steady 200 req/s across $N=3$ running instances. Forcibly terminate one instance via AWS CLI:
  `aws ec2 terminate-instances --instance-ids <ID>`
* **Measurement:** Track the exact number of HTTP 502/504 errors generated, the time until ALB marks the instance unhealthy (target 20s), and the time until ASG provisions and warms up a healthy replacement.

---

## 4. Service Level Objectives (SLOs) & Thresholds

| Metric | Threshold Target | Justification / Grounding |
|:---|:---|:---|
| **Success Rate** | $\ge 99.5\%$ HTTP 200s | Flash-sale checkout standard; accounts for transient warmup errors. |
| **Median Latency ($p_{50}$)** | $< 100 \text{ ms}$ | User perceived instantaneous response time. |
| **Tail Latency ($p_{95}$)** | $< 350 \text{ ms}$ | Upper limit for acceptable e-commerce interaction without cart abandonment. |
| **Extreme Tail ($p_{99}$)** | $< 800 \text{ ms}$ | Governed by Dean & Barroso "Tail at Scale" **[A01]**. |
| **Client Dropped Iterations** | $\mathbf{0}$ | Proves the k6 load generator was not CPU-throttled **[A06]**. |
