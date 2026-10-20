# IT457 Technical Glossary: Cloud Computing, Distributed Systems & SRE
**Focus:** Formal Definitions, Mathematical Formulations & Concrete System Context  
**Course:** IT457 - Cloud Computing  
**Document Code:** `research/05-concepts-glossary.md`  

---

## 1. Core Elasticity & Scalability Concepts

### 1.1 Elasticity vs Scalability
* **Scalability:** The structural capability of a system to handle growing workloads by adding hardware resources (horizontal or vertical) without architectural redesign.
* **Elasticity:** The degree to which a system is capable of adapting to workload changes by provisioning and de-provisioning resources in an autonomic, dynamic manner, such that at each point in time the available capacity matches the current demand as closely as possible.
* **Context:** Flipkart scaling from 1,000 to 10,000 container pods during BBD and automatically contracting post-sale is an exhibition of *elasticity*.

### 1.2 Horizontal Scaling (Scale-Out / In) vs Vertical Scaling (Scale-Up / Down)
* **Horizontal Scaling:** Adding more parallel execution nodes (VMs, containers, servers) of the same or similar capacity to a shared pool behind a load balancer.
* **Vertical Scaling:** Increasing the physical capacity (CPU cores, RAM, IOPS bandwidth) of an individual single machine or instance.
* **Trade-off:** Vertical scaling hits physical hardware ceilings and requires downtime; horizontal scaling offers theoretically limitless expansion but introduces distributed coordination overheads ($\beta$ in USL).

### 1.3 Amdahl’s Law
* **Definition:** A formula that predicts the maximum theoretical speedup of an execution program when only a fraction of the program can be parallelized.
* **Formula:** $\text{Speedup}(N) = \frac{1}{\alpha + \frac{1 - \alpha}{N}}$, where $\alpha$ is the strictly sequential portion.

### 1.4 Universal Scalability Law (USL) [A02]
* **Definition:** A mathematical model that characterizes system throughput by accounting for both linear concurrency, queuing contention ($\alpha$), and cross-node cache coherency penalties ($\beta$).
* **Formula:** $C(N) = \frac{N}{1 + \alpha(N-1) + \beta N(N-1)}$
* **Context:** Explains why adding too many EC2 instances behind an ALB can degrade throughput if instances contend on a single database write lock.

---

## 2. Load Balancing & Networking

### 2.1 Layer 4 (Transport) vs Layer 7 (Application) Load Balancing
* **Layer 4 (L4):** Routes incoming packets at the TCP/UDP layer based solely on IP addresses and ports without decrypting TLS or inspecting packet contents. Extreme packet-per-second performance (e.g., AWS NLB).
* **Layer 7 (L7):** Terminates TLS connections and parses HTTP/HTTPS headers, cookies, and URLs to make intelligent routing decisions (e.g., routing `/api/checkout` to heavy instances and `/static/*` to S3/CDN).

### 2.2 Least Outstanding Requests (LOR)
* **Definition:** A dynamic L7 routing algorithm that directs each incoming HTTP request to the target backend instance that currently has the lowest number of concurrent in-flight requests.
* **Context:** Superior to Round-Robin during flash sales because it prevents slower instances (e.g., undergoing garbage collection) from being overwhelmed.

### 2.3 Health Check & Flapping
* **Health Check:** An automated diagnostic probe (e.g., `GET /health`) issued periodically by the load balancer to evaluate backend instance viability.
* **Flapping (Oscillation):** Rapid cyclical state changes of an instance between healthy and unhealthy, or an ASG between scale-out and scale-in, caused by tight thresholds or lack of hysteresis.
* **Mitigation:** Setting a scale-in cooldown period (e.g., 300 seconds) and distinct consecutive health check thresholds.

### 2.4 Connection Draining (Deregistration Delay)
* **Definition:** The period of time an ALB waits before forcibly severing connections to an instance that is being deregistered or scaled in, allowing in-flight HTTP transactions to finish gracefully.

---

## 3. Queueing Theory & Latency Dynamics

### 3.1 Little’s Law
* **Definition:** A fundamental theorem in queuing theory stating that the long-term average number of requests ($L$) in a stationary queueing system is equal to the long-term average effective arrival rate ($\lambda$) multiplied by the average time ($W$) a request spends in the system.
* **Formula:** $L = \lambda \times W$
* **Context:** If Flipkart receives $\lambda = 10,000 \text{ req/sec}$ and average checkout takes $W = 0.2 \text{ sec}$, the infrastructure must maintain concurrency for at least $L = 2,000$ simultaneous in-flight requests.

### 3.2 Kingman’s Formula (Queueing Approximation) [A04]
* **Definition:** An approximation for the mean waiting time in a $G/G/1$ queue, demonstrating that waiting time explodes exponentially as utilization approaches 100%.
* **Formula:** $W_q \approx \left( \frac{\rho}{1 - \rho} \right) \left( \frac{C_a^2 + C_s^2}{2} \right) \left( \frac{1}{\mu} \right)$
* **Context:** Mathematically explains the catastrophic latency collapse during the 2014 Flipkart sale when server CPU utilization hit $98\%$.

### 3.3 Tail Latency & Percentiles ($p_{50}, p_{95}, p_{99}, p_{99.9}$)
* **$p_{50}$ (Median):** 50% of requests complete faster than this value.
* **$p_{99}$ (Tail Latency):** The slowest 1% of requests.
* **The Tail at Scale [A01]:** In a microservice architecture where a single web page requires calls to 100 backend services in parallel, if each service has a 1% probability of a 1-second delay ($p_{99}$), the overall user request has a $(1 - 0.99^{100}) \approx \mathbf{63.4\%}$ probability of experiencing the 1-second delay!

### 3.4 Coordinated Omission [A06]
* **Definition:** A severe measurement flaw in closed-model benchmarking tools where requests that stall or queue on the server delay subsequent requests from being sent, artificially suppressing reported tail latencies.
* **Mitigation:** Using open-model arrival-rate executors (e.g., k6 `ramping-arrival-rate`).

---

## 4. Resilience & Distributed Systems Patterns

### 4.1 Circuit Breaker Pattern
* **Definition:** A design pattern that wraps remote service calls in a state machine (Closed, Open, Half-Open). If failure rates exceed a threshold, the circuit trips (Open) and subsequent calls immediately fail fast or return fallback data without hitting the downstream service.

### 4.2 Bulkhead Pattern
* **Definition:** Partitioning system resources (e.g., thread pools, memory limits, database connection pools) into isolated compartments so that failure in one non-critical domain (e.g., user recommendations) cannot starve critical domains (e.g., payments).

### 4.3 Thundering Herd Problem
* **Definition:** A phenomenon where a large number of concurrent clients or processes simultaneously request a missing resource (e.g., cache miss or server restart), overwhelming the backend.

### 4.4 Chaos Engineering
* **Definition:** The discipline of experimenting on a distributed software system in production or staging environments to build confidence in the system's capability to withstand turbulent conditions (e.g., LitmusChaos at Flipkart **[E04]**).

---

## 5. Cloud Economics & SRE Metrics

### 5.1 Service Level Terminology (SLI, SLO, SLA)
* **Service Level Indicator (SLI):** A carefully defined quantitative measure of some aspect of the level of service that is provided (e.g., HTTP response latency $< 500$ ms).
* **Service Level Objective (SLO):** A target value or range of values for a service level that is measured by an SLI (e.g., 99.9% of requests meet the SLI over a rolling 30-day window).
* **Service Level Agreement (SLA):** An explicit or implicit contract between a service provider and users, with financial or contractual consequences for breaching SLOs.

### 5.2 CapEx vs OpEx
* **CapEx (Capital Expenditure):** Upfront, major capital investments in fixed assets (e.g., buying Dell servers, storage arrays, network switches) depreciated over multiple years.
* **OpEx (Operational Expenditure):** Ongoing, operational costs incurred during day-to-day business operations (e.g., on-demand AWS billing, electricity, data center cooling).

### 5.3 Total Cost of Ownership (TCO)
* **Definition:** A comprehensive financial estimate intended to help buyers and enterprise leaders determine the direct and indirect costs of a product or system over its entire lifetime.
