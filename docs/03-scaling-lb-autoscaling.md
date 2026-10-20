# IT457 Research Deep Dive: Load Balancing & Elastic Autoscaling Theory
**Focus:** Algorithmic Mechanics, Control Theory, Target Tracking Mathematics & Health Check Dynamics  
**Course:** IT457 - Cloud Computing  
**Document Code:** `research/03-scaling-lb-autoscaling.md`  

---

## 1. Mathematical Models of Scaling: Horizontal vs Vertical

Scalability in distributed computing is governed by mathematical laws that define how system capacity changes as resources are added:

```
            Throughput C(N)
                 ▲                     Linear Ideal (C = N)
                 │                   . '
                 │                 . '
                 │               . '  Universal Scalability Law (USL)
                 │            . '    . - - - - - - (Contention α)
                 │          .'   . '
                 │        .'  . '
                 │      .' . '     \
                 │    .' .'          \  Retrograde Degradation (Coherency β)
                 │  .' .'             \
                 │.' .'                 ▼
                 └──────────────────────────► Number of Nodes / Instances (N)
```

### 1.1 Amdahl’s Law vs Gunther’s Universal Scalability Law (USL)

* **Amdahl’s Law:** States that speedup is limited by the strictly serial fraction ($\alpha$) of a program:
$$\text{Speedup}(N) = \frac{1}{\alpha + \frac{1 - \alpha}{N}}$$
Amdahl's law predicts an asymptotic ceiling, meaning adding infinite instances eventually yields zero marginal speedup. However, it fails to account for inter-node communication penalties.

* **Gunther’s Universal Scalability Law (USL) [A02]:** Extends Amdahl’s formulation to capture both resource contention ($\alpha$) and cross-talk / cache coherency penalties ($\beta$):
$$C(N) = \frac{N}{1 + \alpha(N - 1) + \beta N(N - 1)}$$
Where:
* $N$ = Number of parallel compute instances (e.g., EC2 virtual machines).
* $\alpha$ = **Contention coefficient:** Fraction of execution time spent waiting for shared resources (e.g., centralized MySQL lock or ALB queue).
* $\beta$ = **Coherency / Cross-talk coefficient:** Penalty for distributed state coordination and cache invalidation across nodes.
* **Crucial Implication for BBD:** When $\beta > 0$, the throughput curve is **retrograde**; scaling beyond an optimal point $N^*$ actually decreases total system throughput due to distributed thrashing and locking overheads. Autoscaling must be strictly bounded to prevent the system from entering the retrograde collapse zone.

---

## 2. Load Balancer Architecture: Layer 4 vs Layer 7

A load balancer acts as a reverse proxy orchestrating traffic between clients and backend worker pools.

```
                  ┌───────────────────────────────────────────────┐
                  │                 CLIENT REQUEST                │
                  └───────────────────────┬───────────────────────┘
                                          │
                      ┌───────────────────┴───────────────────┐
                      │                                       │
                      ▼                                       ▼
    ┌───────────────────────────────────┐   ┌───────────────────────────────────┐
    │     LAYER 4: NETWORK LB (NLB)     │   │   LAYER 7: APPLICATION LB (ALB)   │
    │  - Operates at TCP/UDP Layer      │   │  - Operates at HTTP/HTTPS Layer   │
    │  - No packet payload inspection   │   │  - Full TLS Termination           │
    │  - Extreme throughput (millions)  │   │  - Path/Header/Cookie Routing     │
    │  - Hash: IP 5-tuple               │   │  - Connection Multiplexing        │
    └─────────────────┬─────────────────┘   └─────────────────┬─────────────────┘
                      │                                       │
                      ▼                                       ▼
             Target EC2 Instance                     Target EC2 Instance
```

### 2.1 Algorithmic Routing Comparison

| Routing Algorithm | Operational Mechanics | Pros in Flash Sales | Cons / Failure Modes |
|:---|:---|:---|:---|
| **Round Robin (RR)** | Requests distributed strictly sequentially ($1 \to 2 \to 3 \to 1$). | Zero computational overhead; perfectly fair under homogeneous execution times. | Degrades rapidly when requests have variable compute times (e.g., static `/health` vs heavy `/work`). |
| **Weighted Round Robin** | Allocates proportionally based on assigned static instance weights. | Accommodates heterogeneous instance sizes (e.g., t3.micro vs t3.medium). | Inflexible to dynamic runtime degradation (e.g., noisy neighbor or garbage collection pauses). |
| **Least Outstanding Requests (LOR) [P02]** | Routes incoming request to the target currently processing the lowest number of concurrent in-flight requests. | **Optimal for flash sales:** Automatically shields slower/struggling instances and routes around micro-bursts. | Requires state synchronization across ALB nodes; slight processing overhead over RR. |

* **Project Implementation Rule:** AWS Application Load Balancer defaults to Round Robin across availability zones, but supports **Least Outstanding Requests** routing. In our lab exercise, LOR provides superior tail latency stability under CPU-bound workloads.

### 2.2 Health Check State Dynamics

The Application Load Balancer continuously polls registered targets to ensure traffic is never routed to crashed or saturated instances:
* **Healthy Threshold:** Number of consecutive successful responses (`200 OK`) before marking a booting target as `Healthy` (typically 2).
* **Unhealthy Threshold:** Number of consecutive failed polls or timeouts before ejecting a target (`Unhealthy`) (typically 2).
* **Interval:** Frequency of probes (e.g., 15 seconds).
* **Timeout:** Time to wait before marking a single probe failed (e.g., 5 seconds).
* **Detection Latency:** Total time required to isolate a failed instance:
$$\text{Time to Eject} = \text{Interval} \times (\text{Unhealthy Threshold} - 1) + \text{Timeout} = 15 \times (2 - 1) + 5 = 20 \text{ seconds}$$
During this 20-second window, any requests routed to the failing instance will fail. This proves why graceful degradation, client-side timeouts, and retries with exponential backoff are mandatory.

---

## 3. Control Systems Theory & Elastic Autoscaling Dynamics

An Auto Scaling Group (ASG) functions as a closed-loop **proportional control system**:

```
                       ┌────────────────────────────────┐
                       │   Target Metric Setting (r)    │
                       │     (e.g., CPU = 50.0%)        │
                       └───────────────┬────────────────┘
                                       │
                                       ▼
    ┌──────────────┐      Error (e)   ┌─────────────────┐  Scaling ΔN   ┌──────────────┐
    │ Plant Metric │ ────( - )──────► │ ASG Controller  │ ────────────► │  EC2 Target  │
    │ Measured (y) │                  │  (Target Track) │               │   Instances  │
    └──────────────┘                  └─────────────────┘               └──────────────┘
```

### 3.1 Target Tracking Mathematical Formula [P01]

When configured with a target tracking policy (e.g., `ASGAverageCPUUtilization = 50%`), CloudWatch and EC2 Auto Scaling continuously evaluate:
$$\Delta N = \text{CurrentCapacity} \times \left( \frac{\text{CurrentMetricValue}}{\text{TargetValue}} - 1 \right)$$

#### Example Calculation:
* Current running capacity: $N = 2$ instances.
* Current observed CPU utilization: $80\%$.
* Target setpoint: $50\%$.
$$\Delta N = 2 \times \left( \frac{80}{50} - 1 \right) = 2 \times (1.6 - 1) = 2 \times 0.6 = +1.2$$
Rounding to the nearest integer, the ASG immediately initiates the launch of **$+1$ instance** (scaling to $N = 3$).

### 3.2 System Delays and The Scaling Lag Phenomenon

Autoscaling is never instantaneous. The total reaction delay ($\tau_{\text{total}}$) consists of four distinct phases:
$$\tau_{\text{total}} = \tau_{\text{metric}} + \tau_{\text{alarm}} + \tau_{\text{launch}} + \tau_{\text{warmup}}$$

1. **$\tau_{\text{metric}}$ (CloudWatch Aggregation Delay):** Basic monitoring aggregates metrics over 5-minute windows; detailed monitoring aggregates over 1-minute windows ($\tau_{\text{metric}} \approx 60 \text{ s}$).
2. **$\tau_{\text{alarm}}$ (Evaluation Period):** CloudWatch requires metric breaches across consecutive evaluation periods before triggering state changes ($\approx 60 \text{ s}$).
3. **$\tau_{\text{launch}}$ (EC2 Provisioning Time):** Hardware allocation, hypervisor boot, OS initialization, and network attachment ($\approx 45 \text{ to } 90 \text{ s}$).
4. **$\tau_{\text{warmup}}$ (Default Instance Warmup):** Execution of Cloud-Init user-data scripts, Docker pull, FastAPI container spin-up, and passing ALB initial health checks ($\approx 60 \text{ s}$).

$$\tau_{\text{total}} \approx 60 + 60 + 60 + 60 = 240 \text{ seconds (4 minutes!)}$$

> **Critical Theoretical Finding:** If a flash-sale traffic spike ramps up within 30 seconds, a reactive autoscaler is physically incapable of preventing immediate overload. In the 4-minute lag window, backend queues overflow, and latency explodes. This proves why pre-warmed scheduled scaling and front-end queue rate limiting are essential complements to reactive autoscaling.

### 3.3 Hysteresis, Cooldowns & Oscillation (Flapping) Prevention

If an autoscaler scales down immediately when load drops, a subsequent micro-burst will force it to scale up again. Rapid cycling between scaling states is called **flapping** or **thrashing**:
* It destroys application stability (ongoing connections are severed during instance termination).
* It inflates cloud billing (instances are billed for full hourly or partial minute increments).
* **Mitigation:** **Scale-In Cooldowns (e.g., 300 seconds)** and asymmetric thresholds. The system scales *out* aggressively (short warmup), but scales *in* conservatively and slowly.
