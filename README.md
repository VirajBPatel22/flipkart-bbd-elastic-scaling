# Flipkart Big Billion Days — Elastic Scaling Case Study

> **IT457 Cloud Computing | Case Study: Scalability & High-Traffic Events**

[![Live System](https://img.shields.io/badge/Live%20URL-Active-brightgreen)](http://REPLACE-WITH-ALB-DNS)
[![Course](https://img.shields.io/badge/Course-IT457%20Cloud%20Computing-blue)]()
[![Case](https://img.shields.io/badge/Case-Flipkart%20BBD-orange)]()

---

## Project Overview

This project analyzes **Flipkart's Big Billion Days (BBD)** flash-sale infrastructure and replicates its core elastic scaling architecture on AWS Academy Learner Lab.

**Research Question:** How does mean and p95 latency change as instance count grows under a BBD-like ramp load, and what does it cost?

**Hypotheses:**
- **H1:** p95 latency falls as instances increase until a shared bottleneck saturates.
- **H2:** Autoscaling lags the traffic ramp by ~4 minutes, causing a transient latency spike.

---

## Live System

| Endpoint | Description |
|:---|:---|
| `GET /` | Instance metadata (ID, IP, timestamp) |
| `GET /health` | ALB health check probe |
| `GET /work?n=5000` | CPU-bound workload (prime calculation) |

> **Live URL:** `http://REPLACE-WITH-ALB-DNS-NAME`

---

## Architecture

```
k6 Load Generator
      │ HTTP open-model arrival rate
      ▼
Application Load Balancer (Internet-facing, Multi-AZ)
      ├──► EC2 t2.micro (AZ-A) ─┐
      └──► EC2 t2.micro (AZ-B) ─┤ FastAPI in Docker
                                  │
Auto Scaling Group (Min:1, Max:5) ◄── CloudWatch (CPU 50% target tracking)
```

---

## Repository Structure

```
flipkart-bbd-elastic-scaling/
│
├── README.md              ← You are here
├── masterplan.md          ← Single source of truth (read this first)
│
├── docs/                  ← Full research library (11 files)
│   ├── 00-sources-index.md
│   ├── 01-flipkart-bbd-case.md
│   ├── 02-hybrid-cloud.md
│   ├── 03-scaling-lb-autoscaling.md
│   ├── 04-cost-tco.md
│   ├── 05-concepts-glossary.md
│   ├── 06-exercise-design.md
│   ├── 07-academic-research-benchmarks.md
│   ├── 08-load-testing-k6-locust.md
│   ├── 09-aws-learner-lab-playbook.md
│   └── 10-report-viva-project-management.md
│
├── app/                   ← FastAPI web application (Week 2)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── infra/                 ← AWS CLI deployment scripts (Week 3)
│   ├── deploy_lab.sh
│   └── teardown_lab.sh
│
├── loadtest/              ← k6 load test scripts (Week 3)
│   └── k6/
│       ├── smoke.js
│       ├── e1-static.js
│       └── e2-ramp.js
│
├── results/               ← Raw and processed experiment data (Week 3)
│   ├── raw/
│   └── plots/
│
├── analysis/              ← Python plotting scripts (Week 3)
│   └── plot_results.py
│
└── report/                ← IEEE 10-page report (Week 4)
    └── report.md
```

---

## Quick Start (Reproduce in 5 Steps)

```bash
# 1. Clone the repo
git clone https://github.com/VirajBPatel22/flipkart-bbd-elastic-scaling.git
cd flipkart-bbd-elastic-scaling

# 2. Configure AWS CLI (Learner Lab credentials)
aws configure  # Paste from Lab -> AWS Details -> Cloud Access

# 3. Deploy full stack (VPC + ALB + ASG + Target Tracking)
chmod +x infra/deploy_lab.sh
./infra/deploy_lab.sh

# 4. Run load tests (replace with your ALB DNS)
export ALB_DNS="your-alb-dns-here.elb.amazonaws.com"
k6 run -e TARGET_URL="http://$ALB_DNS" loadtest/k6/smoke.js

# 5. Tear down after experiments (IMPORTANT: prevents budget bleed)
./infra/teardown_lab.sh
```

---

## Team

| Member | Role | GitHub |
|:---|:---|:---|
| Viraj Patel | Infrastructure & CloudOps Lead (Member A) | [@VirajBPatel22](https://github.com/VirajBPatel22) |
| [Member B Name] | Application & Load Testing Lead (Member B) | @member-b |
| [Member C Name] | Research, Cost & Documentation Lead (Member C) | @member-c |

---

## Key Findings (to be updated after experiments)

| Metric | N=1 | N=2 | N=3 | N=4 | N=5 |
|:---|:---:|:---:|:---:|:---:|:---:|
| p50 Latency (ms) | — | — | — | — | — |
| p95 Latency (ms) | — | — | — | — | — |
| Error Rate (%) | — | — | — | — | — |

---

## AWS Budget Log

| Date | Action | Approx Spend | Budget Remaining |
|:---|:---|:---:|:---:|
| Week 1 | Lab setup & verification | $0.00 | $100.00 |

---

## References

See [`docs/00-sources-index.md`](docs/00-sources-index.md) for the complete annotated bibliography.

Key sources:
- Flipkart FY25 Audited MCA Filings (Walker Chandiok & Co LLP, June 2025)
- Google Cloud Blog: Flipkart's DX Journey (Oct 2023)
- Aerospike: Flipkart 90M QPS Case Study (Nov 2025)
- CNCF: Flipkart LitmusChaos Case Study (2024)
- Dean & Barroso, "The Tail at Scale", CACM 2013
- Gunther, "Universal Scalability Law", 2007
