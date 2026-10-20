# IT457 Project Kit: Report, Viva and Project Management
**Case:** Flipkart Big Billion Days (BBD) traffic scaling, hybrid cloud plus own infrastructure
**Exercise:** a web app behind a load balancer with autoscaling, load tested with k6 or Locust, plotting response time against instance count
**Team:** Member A (infra), Member B (app + testing), Member C (research + docs)

> **How to use this file.** Sections 1 to 9 are copy-paste templates. Square brackets `[like this]` are placeholders. Claims taken from the web carry a tag like **[S3]**, and the source list is at the end.
>
> **Caveats.**
> - I could not open `IT457_Project_ Doc.pdf` (binary files are unreadable to my tools). I used only your summary of the course plan. Where the PDF says something different, the PDF wins.
> - The sections of the rubric (section 8) are *guesses*. They are modelled on published course rubrics **[S14]**, not on your TAs' actual rubric.
> - Flipkart figures come from press and vendor blogs. Cite them as "reported by", never as audited fact.
> - I had no sibling research files to read (`research/` held only an empty `_tmp/`). File names in section 1 are placeholders. Rename them to match what you actually produce.

---

## What the sources told me (the 10 decisions that shaped this kit)

| # | Guidance | Source | Where it shows up |
|---|---|---|---|
| 1 | The IEEE structure (Title, Abstract, Intro, Methods, Results, Discussion, Conclusion, References) is the safe default. Abstract is a single self-contained paragraph of 250 words or fewer. Methods must be detailed enough for someone to replicate. | [S5][S6] | §2 |
| 2 | A case study needs a bounded "case", explicit propositions or questions, multiple evidence sources (triangulation), and rival explanations. | [S7] | §2, §7 |
| 3 | For the decision part of the case, use HBS-style PACADI: Problem, Alternatives, Criteria, Analysis, Decision, Implementation. | [S8] | §2 |
| 4 | GitHub flow: short-lived branches, small isolated commits, pull requests for review. Conventional Commits gives a machine-readable `type(scope): description` format. | [S1][S3] | §4 |
| 5 | GitHub Projects (table, board, roadmap) syncs with issues and PRs. Break big issues into small ones, and use milestones per week. | [S4] | §3, §4 |
| 6 | C4 model: a Context diagram and a Container diagram are enough for a student project. Every diagram needs a title and a legend. | [S2] | §2 figures |
| 7 | Use current AWS Architecture Icons with draw.io. Commit the PNG *and* the `.drawio` source, and keep diagrams readable at about 700 px wide. | [S13] | §2, §4 |
| 8 | Learner Lab has a 4-hour session timer, EC2 instances are suspended at session end, the budget display lags (up to about 8 hours), and Reset does not restore the budget. | [S9] | §6 risks |
| 9 | k6 *open-model* executors (`ramping-arrival-rate`) avoid coordinated omission. Thresholds codify SLOs. `dropped_iterations` reveals an under-provisioned load generator. | [S11] | §6, §7 |
| 10 | Published cloud courses grade: working autoscaling, IaC, architecture diagram, load-test evidence, budget discipline, and (separately) individual contribution and presentation. | [S14] | §8 |

---

# 1. Week-1 One-Page Summary Template (pre-structured for Flipkart)

Keep it to **one A4 page**: 10 to 11 pt font, 2 cm margins. The bracketed `← pull from` notes are for you. Delete them before submitting.

```markdown
# IT457 Week 1: Source Summary and Salient Points
**Project:** [Working title, e.g. "Elastic Scaling for a Flash-Sale Workload: Flipkart BBD as a Case"]
**Team:** A [name, roll no.] · B [name, roll no.] · C [name, roll no.]   **Date:** [dd-mm-yyyy]
**Repo:** [GitHub URL]   **Week-1 progress doc:** [link]

## 1. Problem in one sentence
[Flipkart's BBD sale produces traffic reported at 6–8× normal volume [S16], concentrated into hours,
and forces a choice between over-provisioned own infrastructure and elastic cloud.]
← pull from: research/[01-flipkart-bbd-case].md §Background

## 2. Sources reviewed (6–10 lines; one line each)
| # | Source (author, year, type) | Why it matters | Reliability (H/M/L) |
|---|---|---|---|
| 1 | [Google Cloud blog, 2023, vendor] | BBD surge, data-centre-to-cloud migration | M (vendor) |
| 2 | [Mint, 2018, press] | 2014 outage, new DC and private cloud | M |
| 3 | [AWS EC2 Auto Scaling docs] | Target tracking, warmup | H |
| 4 | [k6 docs: open vs closed models] | Valid load-test design | H |
| 5 | [Yin / HBS case method] | How we structure the case analysis | H |
← pull from: research/[00-sources-index].md

## 3. Five salient points (one sentence each, each with a source tag)
1. **Demand shape:** [spike factor, duration, predictability]. ← research/[01-…]
2. **Failure history:** [2014 crash and lessons]. ← research/[01-…]
3. **Hybrid rationale:** [own DCs for base load plus cloud for burst, with reasons]. ← research/[02-hybrid-cloud].md
4. **Scaling mechanics:** [horizontal scaling, LB, autoscaling policies]. ← research/[03-scaling-lb-autoscaling].md
5. **Cost model:** [capex vs opex, utilisation, break-even]. ← research/[04-cost-tco].md

## 4. Key concepts we will use (term, 10-word definition)
Elasticity · horizontal vs vertical scaling · load-balancing algorithm · target tracking · TCO · hybrid cloud
← pull from: research/[05-concepts-glossary].md

## 5. Research question and hypotheses
**RQ:** [How does mean and p95 latency change as instance count grows under a BBD-like ramp, and what does it cost?]
**H1:** [p95 latency falls as instances rise until the app saturates a shared bottleneck.]
**H2:** [Autoscaling lags the ramp by roughly the instance warmup time (~[X] s), causing a latency spike.]

## 6. Planned exercise (2 lines) and gaps / open questions (3 bullets)
[ALB + ASG (min 1, max [N]) + [app]; k6 ramping-arrival-rate; plot p95 vs instance count.]
← pull from: research/[06-exercise-design].md
- [Which instance family is allowed in Learner Lab?] - [How will we show "hybrid"?] - [Cost-model assumptions?]

## 7. Who read what
A: [sources #…] · B: [sources #…] · C: [sources #…]
```

**Quality bar:** every bullet has a source tag, you state at least one thing you are *unsure* about, and every member is credited for at least two sources.

---

# 2. Ten-Page Report Skeleton

**Format.** IEEE-style headings **[S5][S6]**. Use two-column IEEE or single-column 11 pt, whichever the course allows. Confirm with the TA whether the references and appendices count toward the 10 pages. This budget assumes they do **not**.

**Week-2 vs final.** In Week 2 write §1–§5 and §11 in full, put short "to be completed" stubs in §6–§9, and keep the same headings. In Weeks 3–4 you fill in the stubs. Nothing needs restructuring.

## 2.1 Page budget and contents

| § | Section | Pages | Owner (author / reviewer) | Must contain |
|---|---|---|---|---|
| 0 | Title, abstract, keywords | 0.3 | C / A | Specific title with no "novel" **[S5]**. One-paragraph abstract of 250 words or fewer covering problem, method, headline numbers, conclusion. 3–5 keywords. Written *last*. |
| 1 | Introduction | 0.7 | C / B | Context (flash sales). The gap. RQ and hypotheses. Contributions as a bullet list. One-paragraph roadmap. |
| 2 | Case background: Flipkart BBD | 1.1 | C / A | Scale and demand-shape facts with citations. 2014 outage and later changes. Current stack as publicly reported (own DCs, private cloud, Kubernetes, cloud for data platform **[S16]**). Mark inference vs fact. |
| 3 | Concepts and related work | 0.9 | A / C | Elasticity, scaling types, LB algorithms, autoscaling policies, hybrid cloud, CAP. Only what §4–§8 use. |
| 4 | Case analysis (PACADI **[S8]**) | 1.2 | C / B | Problem, 3–5 alternatives (own-only, cloud-only, hybrid, CDN/queue-based shedding), criteria with weights, scored analysis table, recommendation, implementation. Bring in rival explanations **[S7]**. |
| 5 | Exercise design and architecture | 1.5 | A / B | C4 Context + Container diagram (or AWS icon diagram). Component choices and *why*. Experiment matrix. Metrics definitions. SLO. Test-data and repeat plan. |
| 6 | Implementation | 0.8 | A + B / C | Repo layout, IaC or CLI steps, app endpoints, ASG and LB settings in a table, live URL, how to reproduce in 5 steps. |
| 7 | Experiments and results | 1.6 | B / A | E1 static sweep, E2 autoscaling run, E3 failure/overload run. Plots and tables with CIs. Observations *before* interpretation. |
| 8 | Cost and TCO analysis | 0.7 | A / C | Measured exercise cost. Extrapolation model for BBD-like load. Own vs cloud vs hybrid break-even. Assumptions table. |
| 9 | Discussion, limitations, validity | 0.6 | all | What the results mean for the case. Rival explanations. Threats to validity (construct, internal, external, reliability **[S7]**). What went wrong. |
| 10 | Conclusion and future work | 0.3 | C / A | Answer RQ in 3 sentences. Recommendation. 2–3 realistic next steps. |
| 11 | Team roles, timeline, contributions | 0.3 | C / all | RACI summary, weekly plan vs actual, per-member contribution table. |
| | **Total** | **10.0** | | |
| | References (IEEE numeric), Appendices (raw tables, configs, k6 script) | outside | | Not counted. Confirm. |

## 2.2 Figure and table checklist

- [ ] **F1** C4 *System Context*: users, Flipkart-like shop, CDN, payments (external) **[S2]**
- [ ] **F2** Architecture (Container or AWS-icon) of your exercise: Internet → ALB → ASG (EC2) → [DB/cache if any]; CloudWatch alarm → ASG
- [ ] **F3** Hybrid concept diagram: own DC (base load) + cloud (burst) + traffic split
- [ ] **F4** Experiment timeline: k6 stages vs time
- [ ] **F5** **Response time vs instance count** (the required plot): p50/p95/p99, error bars from repeats, SLO line
- [ ] **F6** Time-series of instance count, request rate and p95 latency on one time axis (shows scale-out lag)
- [ ] **F7** Cost vs load for own, cloud and hybrid (break-even marked)
- [ ] **T1** Source reliability table (from Week 1)
- [ ] **T2** PACADI alternatives vs weighted criteria
- [ ] **T3** ASG/ALB configuration (min, max, target, warmup, health check)
- [ ] **T4** Experiment matrix (ID, load profile, instance setting, repeats)
- [ ] **T5** Results table (median, IQR, error rate, throughput)
- [ ] **T6** Cost assumptions and results
- [ ] **T7** Per-member contribution table with commit and PR counts
- Every figure: numbered caption *below*, referenced in text *before* it appears, readable in greyscale, axes labelled with units, legend present **[S2][S13]**.
- Every diagram: PNG plus `.drawio` source committed together **[S13]**.

## 2.3 Writing tips

1. **Message first, chronology never.** A report presents a message with evidence, not a diary of what you did **[S6]**. The test: could a reader state your main finding after reading only the abstract and the figure captions?
2. **One claim per paragraph, evidence in the same paragraph.** Pattern: claim → data → interpretation → caveat.
3. **Separate observation from interpretation.** "p95 fell from X to Y ms between 1 and 3 instances" is an observation. "Because the ALB spread load" is an interpretation, and it needs a reason.
4. **Methods you could replicate.** Include instance type, region, AMI or container tag, k6 version, test duration, warmup discard, repeats **[S5]**.
5. **Report failed runs honestly.** Negative or messy results with a diagnosis score better than a suspiciously clean plot.
6. **Active voice, "we".** Short sentences. Define every abbreviation once **[S6]**.
7. **Number discipline.** Same units everywhere (ms, req/s, USD), 2–3 significant figures, and always the sample size.
8. **Cite web claims.** Flipkart numbers get "reported by [n]". Never launder a press figure into fact.
9. **Draft in the repo.** Write in Markdown or LaTeX under `report/`, so commits show who wrote what.
10. **Read-aloud pass and a cross-reviewer.** The person who did not write a section edits it. This is also your viva training.

## 2.4 Example paragraph (about 1 page of style; all numbers are placeholders)

> **7.2 Effect of instance count on latency (E1).** To isolate the effect of horizontal scaling from autoscaling dynamics, we fixed the Auto Scaling group at *N* ∈ {1, 2, 3, 4, 5} instances and applied an identical open-model load of [400] requests per second for [10] minutes, discarding the first [60] seconds as warmup. Each configuration was repeated three times. Figure 5 shows that the 95th-percentile response time fell from [1,840 ms] (*N* = 1) to [210 ms] (*N* = 3), a reduction of roughly [89%], while the error rate fell from [14.2%] to [0.1%]. Between *N* = 3 and *N* = 5, however, p95 improved by only [18 ms] and throughput stayed near [400] req/s, indicating that the offered load was already fully served. Additional instances therefore bought headroom but no latency benefit at this load level.
>
> Two observations qualify this result. First, the three repeats at *N* = 1 differed by a factor of [1.6] in p95 (IQR [1,520–2,430 ms]), which we attribute to CPU-credit exhaustion on the burstable instance type: CloudWatch showed `CPUCreditBalance` approaching zero in the second repeat. This is a threat to internal validity, and we discuss our mitigation in §9. Second, k6 reported [0] dropped iterations in all runs and the load generator's CPU stayed below [55%], so the observed latency reflects the system under test rather than a saturated client. We used an arrival-rate (open-model) executor because a closed model would have lowered the offered load as latency rose, hiding exactly the degradation we wished to measure [S11].
>
> These findings support H1 for *N* ≤ 3 but not beyond. For the BBD case they imply that capacity should be sized to the spike's *arrival rate*, not its average, and that headroom is cheap relative to a degraded checkout path. We return to this trade-off in §8, where [three extra instances for the 10-minute spike cost about USD [0.12]].

**What this paragraph does:** states the method in one sentence, gives numbers with units, separates observation from interpretation, reports a limitation, ties back to the case, and signposts the next section.

---

# 3. Weekly Progress Tracker Template

Create one file per week at `docs/progress/week-NN.md`, plus a project-level `docs/progress/README.md` index. The TA reviews these, so keep links live. Link every claim to a commit, PR or issue. Mirror the plan in a **GitHub Project** board with a milestone per week **[S4]**.

```markdown
# Week [N] Progress Report: [Project title]
**Period:** [dd-mm] to [dd-mm]   **Prepared by:** [member]   **TA review:** [ ] seen  [ ] comments
**Status:** 🟢 on track / 🟡 at risk / 🔴 blocked   **Project board:** [URL]   **Milestone:** [URL]

## 1. Goals for this week (from last week's plan)
| ID | Goal | Owner | Issue | Due |
|---|---|---|---|---|
| G1 | [e.g. ASG + ALB deployed] | A | #[n] | [day] |

## 2. Done (evidence required)
| Goal ID | Outcome | Evidence (commit/PR/screenshot) |
|---|---|---|
| G1 | [Done / partial / not done] | [PR #12](url), [commit abc1234](url) |

## 3. Not done and why
[Item → reason → carry-over to week N+1 (new issue #)]

## 4. Blockers and risks
| Blocker / risk | Impact | Action | Owner | Needs TA help? |
|---|---|---|---|---|
| [Learner Lab session reset wiped the ASG] | [lost 2 h] | [IaC script re-creates in 5 min] | A | No |
Risk register changes: [link to docs/risk-register.md diff]

## 5. Key results or decisions this week
- [Decision: chose ALB over NLB because …] (ADR link `docs/adr/0002-….md`)
- [First measurement: p95 = … ms at N = …]

## 6. Metrics snapshot
| Metric | Value | Δ vs last week |
|---|---|---|
| Commits on `main` (team / A / B / C) | [ / / / ] | |
| PRs merged / reviews given | [ ] | |
| Issues closed / open | [ ] | |
| AWS spend to date (USD, Learner Lab display) / budget | [ ] | |
| Report pages drafted | [ ]/10 | |

## 7. Per-member contribution (this week)
| Member | Tasks completed | Commits | PRs opened / reviewed | Hours | Evidence links | Peer-confirmed by |
|---|---|---|---|---|---|---|
| A | | | | | | B |
| B | | | | | | C |
| C | | | | | | A |
Rule: no member may have 0 commits *and* 0 reviews. If so, explain under Blockers.

## 8. Plan for next week
[Table as in §1: Goal, Owner, Issue, Due]

## 9. Questions for TA
1. […]
```

**Weekly ritual (30 min, same day each week):** every member updates their row, one person assembles it, a second person checks every link, and then you merge it via PR `docs(progress): week N report`.

---

# 4. GitHub Workflow Pack

## 4.1 Repo name suggestions
`bbd-elastic-lab` · `flash-sale-autoscaling-it457` · `bigbillion-scaling-study` · `elastic-commerce-it457` · `hybrid-burst-lab`
Pick one, make the repo **public** (or add the TAs as collaborators if private), and put the live URL in the repo "About" box.

## 4.2 Folder structure

```
bbd-elastic-lab/
├── README.md                  # what, live URL, architecture PNG, how to run, team table
├── LICENSE
├── .gitignore
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/ (task.md, bug.md)
├── docs/
│   ├── week1-summary.md
│   ├── progress/ (README.md, week-01.md … week-05.md)
│   ├── adr/                   # architecture decision records (0001-alb-vs-nlb.md)
│   ├── diagrams/              # *.drawio + exported *.png [S13]
│   ├── raci.md   risk-register.md   viva/ (questions.md, demo-script.md, slides-outline.md)
├── report/                    # report.md or main.tex, refs.bib, figures/
├── app/                       # web app, Dockerfile, healthcheck, tests/
├── infra/                     # Terraform or AWS CLI scripts; launch template, ASG, ALB, alarms
├── loadtest/
│   ├── k6/ (smoke.js, e1-static.js, e2-ramp.js, thresholds.js)
│   └── locust/ (optional)
├── results/
│   ├── raw/                   # k6 --summary-export JSON, CSV (small!)
│   ├── processed/             # aggregated CSV
│   └── plots/                 # PNG from analysis scripts
├── analysis/                  # plot_latency_vs_instances.py, requirements.txt
└── cost/                      # assumptions.csv, tco-model.xlsx or .py, pricing screenshots
```

**Rules:** raw outputs must be small (summaries and CSV, not gigabyte logs). Each experiment has a README with date, commit hash of the app, and config. Do not commit generated `.terraform/`.

## 4.3 Branch strategy (GitHub flow **[S3]**)

- `main` is always deployable and always matches the live URL. **Protect it:** require 1 approving review, and no force-push **[S3]**.
- Short-lived branches: `<type>/<member>-<topic>`, for example `feat/a-asg-target-tracking`, `test/b-k6-ramp`, `docs/c-case-background`. Lifetime: at most 2 days.
- One PR per issue, with `Closes #n` in the description. Each PR is reviewed by a *different* member, in rotation A→B→C→A.
- **Merge method: "Rebase and merge" or "Create a merge commit". Avoid "Squash and merge".** Squashing collapses a PR's commits into one, which hurts the "regular meaningful commits" requirement. Conventional Commits is fine with squash for open-source projects **[S1]**, but your rubric rewards visible history.
- Tag milestones: `v0.1-week1`, `v0.2-week2-report`, `v0.3-experiments`, `v1.0-submission`.

## 4.4 Commit-message convention (Conventional Commits 1.0.0 **[S1]**)

```
<type>[optional scope]: <description>

[optional body: why, not what]
[optional footer: Refs: #12 | Co-authored-by: Name <email>]
```
Types: `feat`, `fix`, `docs`, `test`, `infra`, `perf`, `refactor`, `chore`, `ci`, `revert`. The spec recommends `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf` and `test`, and allows others **[S1]**. `infra` is a project-specific extra, so state that in the README. Scopes: `app`, `asg`, `alb`, `k6`, `report`, `cost`, `progress`, `viva`.

Good: `infra(asg): add target-tracking policy at 50% CPU` · `test(k6): ramping-arrival-rate for E2 with p95<500ms threshold` · `docs(report): draft §2 Flipkart BBD background with sources`
Bad: `update`, `final`, `changes`, `fix stuff`.
**One logical change per commit** **[S3]**: a rename and a feature go in separate commits.
Set up: `git config commit.template .gitmessage` (optional) and `git config user.name/email` per member, so **GitHub attributes commits to the right account**. Mismatched emails make a member's work invisible.

## 4.5 The 30 issues, by week

Roles: **A** = infra, **B** = app + testing, **C** = research + docs. Each issue is small enough for 1–3 commits.

### Week 1: Understand and set up (6 issues)
| # | Issue | Owner | Deliverable / commit type |
|---|---|---|---|
| 1 | Create repo, folders, README skeleton, .gitignore, protect `main` | C | `chore(repo)`, `docs(readme)` |
| 2 | Set up GitHub Project board, milestones W1–W5, issue templates | C | `chore(github)` |
| 3 | Collect and read BBD sources, build source table | C | `docs(research)` |
| 4 | Verify Learner Lab access, allowed services, budget, session behaviour; write findings | A | `docs(infra): lab constraints` |
| 5 | Read ASG/ALB/target-tracking docs; list candidate designs | A | `docs(infra): design options` |
| 6 | Pick app stack, build "hello" endpoint plus `/health` and CPU-bound `/work` endpoint | B | `feat(app)` |

### Week 2: Plan and report (8 issues)
| # | Issue | Owner | Deliverable |
|---|---|---|---|
| 7 | Draft report §1–§2 (intro, case background) | C | `docs(report)` |
| 8 | Draft §4 PACADI case analysis table | C | `docs(report)` |
| 9 | Draw C4 Context and AWS architecture diagrams (.drawio + PNG) | A | `docs(diagrams)` |
| 10 | Write experiment design (E1/E2/E3, metrics, SLO) in `docs/` | B | `docs(loadtest)` |
| 11 | Dockerise app, add unit tests for `/work` | B | `feat(app)`, `test(app)` |
| 12 | Write RACI and risk register files, fill in the §5 and §6 content from this kit | C | `docs(project)` |
| 13 | First manual deploy: one EC2 + ALB, screenshot, record steps | A | `infra(alb)`, `docs(runbook)` |
| 14 | Write cost-model assumptions sheet (instance price, ALB hourly + LCU, data transfer) | A | `docs(cost)` |

### Week 3: Build, measure (11 issues)
| # | Issue | Owner | Deliverable |
|---|---|---|---|
| 15 | Script ASG + launch template + ALB (IaC or CLI) | A | `infra(asg)` |
| 16 | Add CloudWatch target-tracking policy and warmup | A | `infra(asg)` |
| 17 | Publish live URL, smoke-test it, add uptime check | A | `infra(alb)`, `docs(readme)` |
| 18 | Write k6 smoke and ramp scripts with thresholds | B | `test(k6)` |
| 19 | Run E1 static sweep (N=1..5, 3 repeats) and commit raw results | B | `test(results)` |
| 20 | Run E2 autoscaling ramp, collect instance count over time | A + B (pair) | `test(results)` |
| 21 | Plotting script: p95 vs instance count and time-series | B | `feat(analysis)` |
| 22 | Check load-generator health (CPU, dropped_iterations) and log it | B | `docs(results)` |
| 23 | Cost run: record instance-hours, compute cost, compare with static peak | A | `feat(cost)` |
| 24 | TCO model: own vs cloud vs hybrid break-even | C | `feat(cost)`, `docs(cost)` |
| 25 | Write report §5–§6 (design, implementation) from real configs | C | `docs(report)` |

### Week 4: Report and submission (6 issues; two more can be split from #26–#27 if needed)
| # | Issue | Owner | Deliverable |
|---|---|---|---|
| 26 | Write report §7 results with figures and tables | B | `docs(report)` |
| 27 | Write §8 cost/TCO and §9 discussion/validity | C | `docs(report)` |
| 28 | Reproducibility: README "run in 5 steps", teardown script, tag `v1.0` | A | `docs(readme)`, `chore(release)` |
| 29 | Cross-review all sections, proofread, check refs and figure numbers | A (+all) | `docs(report): review fixes` |
| 30 | Viva prep: Q&A rehearsal log, demo script, slide deck | C (+all) | `docs(viva)` |

Label every issue with `week-N`, `infra|app|docs`, and `priority`. Assign every issue before work starts, and link every PR to one.

## 4.6 Commit cadence plan (every member visible every week)

| Week | A (infra) | B (app + testing) | C (research + docs) | Team minimum |
|---|---|---|---|---|
| 1 | 4+ commits: lab constraints notes, design options, first ASG draft | 4+: hello app, `/health`, `/work`, Dockerfile | 6+: repo setup, project board, source table, week-1 summary | 14 commits, 3 PRs |
| 2 | 5+: diagrams, manual ALB runbook, cost sheet | 5+: tests, experiment design, Dockerfile fixes | 6+: report §1/2/4, RACI, risk register | 16 commits, 5 PRs |
| 3 | 8+: IaC, policy, URL, cost run | 8+: k6 scripts, E1/E2 results, plots | 6+: §5/6 report text, TCO model | 22 commits, 8 PRs |
| 4 | 4+: README, teardown, review fixes | 5+: §7 results text, figure polish | 6+: §8/9/10, viva pack | 15 commits, 5 PRs |

**Rules of thumb:** at most 1 day without a commit during Weeks 2–3 for the active member. Commit and push at the end of every work session (even WIP on a branch). Each member reviews at least 2 PRs per week. Review comments count as contribution, so show them in the PR UI. **Never** commit a huge dump at the end. Do not backdate or rewrite history after pushing.

## 4.7 `.gitignore`

```gitignore
# OS / editors
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json

# Secrets and credentials: NEVER commit (Learner Lab keys rotate, but leaks still count)
.env
.env.*
*.pem
*.key
*.ppk
credentials
aws_credentials*
**/aws_session_token*
secrets.*

# Terraform / IaC
.terraform/
*.tfstate
*.tfstate.*
crash.log
*.tfvars
!example.tfvars
.terraform.lock.hcl.bak

# Node / Python app
node_modules/
dist/
build/
__pycache__/
*.pyc
.venv/
venv/
.pytest_cache/
.ipynb_checkpoints/

# Load-test and results (keep summaries, ignore bulky raw dumps)
results/raw/*.log
results/raw/*.out
results/raw/*.bin
*.gz
k6-*.csv.tmp

# Report build artefacts
report/*.aux
report/*.log
report/*.out
report/*.toc
report/*.synctex.gz
~$*
*.tmp
```
(Do not ignore `*.drawio`, `*.png` diagrams or `results/processed/`. Those are deliverables.)

## 4.8 `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## What and why
<!-- 1–3 sentences. Link the issue. -->
Closes #[issue]

## Type
- [ ] feat  - [ ] fix  - [ ] infra  - [ ] test  - [ ] docs  - [ ] perf  - [ ] chore

## Changes
-
-

## How to verify
<!-- Commands, URL, screenshot, k6 output, or report section -->

## Evidence
- [ ] Screenshot / log / plot attached
- [ ] Live URL still works (if infra/app changed): [URL]

## Checklist
- [ ] Commits follow `type(scope): description`
- [ ] No secrets, keys or tfstate in the diff
- [ ] Docs / report / progress file updated if behaviour changed
- [ ] Raw results are small summaries, not huge logs
- [ ] Reviewer is a different team member: @[reviewer]

## Risks / follow-ups
<!-- New issues to open -->
```

---

# 5. Responsibilities Matrix (RACI) with Cross-Training

**R** = Responsible (does the work), **A** = Accountable (one owner; signs off), **C** = Consulted, **I** = Informed. Each row has exactly one A.

| Activity | Member A (infra) | Member B (app + test) | Member C (research + docs) |
|---|---|---|---|
| Source collection, Week-1 summary | C | C | **A/R** |
| Report: case background, PACADI | I | C | **A/R** |
| Report: design, implementation | **A/R** | R | C |
| Report: results and plots | C | **A/R** | R |
| Report: cost and TCO | R | C | **A/R** |
| Architecture diagrams | **A/R** | C | R |
| App development and tests | C | **A/R** | I |
| ASG, ALB, launch template, alarms | **A/R** | C | I |
| Load-test scripts and runs | R | **A/R** | I |
| Cost measurement | **A/R** | C | R |
| GitHub hygiene, board, PR review rota | R | R | **A/R** |
| Weekly progress doc | C | C | **A/R** |
| Risk register upkeep | **A/R** | R | R |
| Viva pack, demo script, slides | R | R | **A/R** |
| Live URL uptime and teardown | **A/R** | C | I |

**Cross-training so anyone can answer anything (viva rule: every member can explain every layer to "level 2").**

| Mechanism | What happens | Evidence |
|---|---|---|
| **Buddy pairs** | A shadows B's load tests; B shadows C's cost model; C shadows A's infra. The buddy co-authors one commit per week using `Co-authored-by:`. | Commit trailers |
| **Rotating PR reviews** | A→B→C→A. A reviewer must be able to explain the change in the PR comments. | PR threads |
| **Swap runs** | In Week 3, B deploys from scratch using A's runbook. C runs one k6 test. A produces one plot. | Runbook issues |
| **Teach-backs (20 min, Weeks 2 and 4)** | Each member explains their area to the other two, who ask three "why" questions. | `docs/viva/teachback-log.md` |
| **Mock viva (Week 4)** | Questions from §7 are drawn at random *for another member's area*. | Rehearsal log |
| **Knowledge cards** | One page per area (`docs/viva/card-infra.md`, `-app-test.md`, `-research.md`) with numbers, decisions and "alternatives rejected". | Files in repo |

**Level 1** = what it is and what it does. **Level 2** = why chosen, the alternative, one number. **Level 3** (own area only) = deep details such as config values and edge cases.

---

# 6. Risk Register

Likelihood (L) and Impact (I): 1 (low) to 5 (high). Score = L × I. Review every Monday and record changes in the progress doc.

| ID | Risk | L | I | Score | Early warning | Mitigation (before) | Contingency (after) | Owner |
|---|---|---|---|---|---|---|---|---|
| R1 | **AWS credits exhausted** | 3 | 5 | 15 | Spend over 50% of the budget before Week 3. Budget display lags up to about 8 h **[S9]** so treat it as an under-estimate. | Cost sheet before running. Small instance types. Cap ASG max (e.g. 4–5). Tear down after every run. Short tests (10 min). Use the Pricing Calculator **[S12]**. One course penalises exhausted budgets **[S14]**. | Ask the TA for a lab reset or credit. Reuse committed raw results. Run reduced-scope E1 only. Fall back to a local Docker + nginx LB demo for the viva. | A |
| R2 | **Learner Lab session expiry (4 h timer) and suspended instances** | 5 | 4 | 20 | Timer shown at top. After expiry, instances are suspended and restart on the next start **[S9]**. | Script everything (IaC or CLI) so the stack re-creates in minutes. Press Start Lab to extend before the timer ends **[S9]**. Plan runs in ≤ 3 h blocks. Store AMI or container image reference in the repo. Check how the ASG behaves after resume *in Week 1*. | Re-run the script. Keep screenshots and logs for each run so that results are not lost. | A |
| R3 | **Load-generator bottleneck** | 4 | 5 | 20 | k6 CPU above 70–80%, `dropped_iterations` above 0 **[S11]**, client latency differs from ALB `TargetResponseTime`. | Run k6 on a separate, adequately sized instance in the same region. `discardResponseBodies`, `preAllocatedVUs` sized by smoke test **[S11]**. Use an open model. Log generator CPU every run (issue #22). Compare with ALB metrics. | Distribute k6 across 2 generators, or lower the target rate. Mark the run invalid and state why. | B |
| R4 | **Results do not show scaling** | 4 | 5 | 20 | Flat latency across N. CPU on instances below 30%. All requests under 20 ms. | Use a CPU-bound `/work` endpoint with measurable service time (~50–100 ms). Do a capacity probe on 1 instance first. Choose load at about 1.5–2× single-instance capacity. Check ALB algorithm and sticky sessions. Watch burstable-credit throttling. Use a static sweep (E1) in addition to autoscaling (E2). | Report it honestly. Diagnose with the "rival explanations" table (client limit, shared DB, credit throttle, warmup) and rerun with a changed workload **[S7]**. | B |
| R5 | **Teammate inactive** | 3 | 5 | 15 | No commits for 3 days. No PR reviews. Missing progress row. | Clear issue assignment. Daily check in the group chat. Buddy pairs. Contribution table each week with evidence. Cross-training so no single point of failure. | Escalate to the TA by end of the week. Redistribute issues. Record the contribution honestly in the report, because individual contribution is graded separately in several courses **[S14]**. | C (process), all |
| R6 | **Live URL down at demo/grading** | 4 | 5 | 20 | Uptime check fails. Lab session about to expire. | Uptime checker (UptimeRobot, GitHub Action ping). Start the lab 30 min before the viva. Static fallback page on GitHub Pages with recorded results and a demo video. Document the *start-up procedure*. Use an Elastic IP or an ALB DNS name, whichever is stable. | Switch to the screen-recorded demo and the local Docker stack. Explain candidly. | A |
| R7 | **Secrets leaked in git** | 2 | 4 | 8 | `git diff` shows `.pem`, token. | `.gitignore` (§4.7), PR checklist, `git-secrets` or pre-commit hook. | Rotate keys immediately, then purge history. | A |
| R8 | **Scope creep** (Kubernetes, multi-region, DB) | 3 | 3 | 9 | Issues outside #1–#30. | Freeze scope at the end of Week 2. Put extras in a "stretch" column. | Cut stretch items first. | C |
| R9 | **Report merge conflicts / late integration** | 3 | 3 | 9 | Multiple people editing one file. | One file per section. Branch per section. Weekly integration. | Freeze on Day 3 of Week 4. | C |
| R10 | **Experiments run too late** | 3 | 5 | 15 | No E1 data by mid-Week 3. | Smoke test the k6 scripts against the Week 2 manual deploy. Book lab hours on the calendar. | Reduce repeats to 2, drop E3. | B |

---

# 7. Viva Prep Pack

**What the panel actually tests:** why you chose each thing, whether you understand what you built (including the failed parts), and whether your claims match your evidence **[S15]**. Expect a teammate's component to be asked about on purpose **[S15]**. Answer in this shape: **direct answer → reason → number or evidence → limitation.** Model answers below are deliberately short. Expand them with *your* real numbers. Where an answer contains `[X]`, replace it with your measured value.

## 7.1 The case (Q1–Q12)

1. **What is the case and why did you choose it?** Flipkart's BBD is a predictable but extreme flash-sale spike, so it is a clean test of elasticity versus fixed capacity. It lets us connect theory to a measurable exercise.
2. **How big is the spike?** Flipkart has been reported to see about 6–8× normal transaction volume during BBD **[S16]**. That is a press and vendor figure, so I cite it as "reported". The shape (a short, sharp peak) matters more than the exact multiple.
3. **What went wrong in 2014?** Reported server crashes and delayed orders. Traffic jumped about 25× the day before the sale and the team was "caught unawares" **[S16]**. The response was a new data centre and private cloud **[S16]**.
4. **Is Flipkart hybrid?** Reported evidence says yes: self-managed data centres plus a private cloud, Kubernetes and VM workloads, and a data platform migrated to Google Cloud **[S16]**. Whether burst traffic goes to public cloud is *our inference*, not a confirmed fact.
5. **Why would a company keep its own infrastructure?** Steady base load is cheaper on owned hardware at high utilisation. There is also control over latency, data and customisation. Cloud is for variable and unpredictable load.
6. **Why not run everything in the cloud?** At sustained high utilisation the cost can exceed owned capacity. Egress and reserved-capacity costs matter. Regulatory and operational control also matter. The break-even depends on utilisation, which §8 models.
7. **Why not run everything on-premises?** You must buy for the peak, which sits idle most of the year. Procurement lead time makes sudden demand hard to meet.
8. **How did Flipkart prepare for BBD?** Reported: months of planning and code freezes **[S16]**, simulating about 15× traffic on live systems **[S16]**, doubling storage **[S16]**, and chaos engineering **[S16]**. I would add that I am summarising press reports, not internal documents.
9. **What is not a scaling problem in BBD?** Supply chain. High website QPS means little if packing and delivery capacity are limited **[S16]**. Our exercise covers only the web tier.
10. **What are the alternatives you compared (PACADI)?** Own-only, cloud-only, hybrid burst, and demand shaping (queues, CDN, waiting room) **[S8]**. Criteria: cost, elasticity, latency, operational complexity, risk. Hybrid scored highest in our weighted table, but it is sensitive to the weights.
11. **What is a limitation of using this case?** Public information is partial and biased, so we triangulate across sources **[S7]**. Our exercise is a scaled-down model, so external validity is limited.
12. **What would you recommend to Flipkart?** Base on owned capacity, pre-scale before the event using forecasts, autoscale for the remainder, and shed non-critical load. Test with realistic traffic beforehand.

## 7.2 Cloud concepts (Q13–Q30)

13. **Define elasticity.** The ability to add and remove resources automatically as demand changes, so that provisioned capacity tracks load. Scalability is the *ability to handle* more load; elasticity is doing it *dynamically in both directions*.
14. **Horizontal vs vertical scaling?** Horizontal adds instances. It needs a load balancer and stateless design, and it is how fault tolerance improves. Vertical makes one machine bigger, which is simple but has a ceiling and a single point of failure.
15. **Why did you pick horizontal?** The ASG and ALB model matches the case. It scales further, tolerates failures, and is elastic at fine granularity.
16. **What does a load balancer do?** It distributes requests across healthy targets, runs health checks, and gives one stable endpoint.
17. **Name load-balancing algorithms.** Round robin, weighted round robin, least connections, least outstanding requests, IP/flow hash, and random. AWS ALB supports round robin (default), least outstanding requests and weighted random. NLB uses flow hashing.
18. **Which algorithm did you use, and why?** [Round robin by default.] With heterogeneous request cost, least outstanding requests would give lower tail latency. [We tested it / we did not, and say so.]
19. **Layer 4 vs Layer 7 load balancing?** L4 (NLB) balances on TCP/UDP flows with very high throughput. L7 (ALB) understands HTTP, so it supports path routing, headers, and richer health checks. We chose ALB for HTTP.
20. **What is a health check and why does it matter during scaling?** It tells the LB to stop sending traffic to unhealthy instances. A new instance must pass it before receiving traffic, which adds to scale-out lag.
21. **Explain target tracking.** You pick a metric and a target value (e.g. 50% average CPU). The service creates the alarms and adjusts capacity, like a thermostat **[S10]**. AWS recommends it over simple scaling **[S10]**.
22. **What are warmup and cooldown?** Warmup is the time before a new instance's metrics count toward the group's average. Cooldown pauses further simple-scaling actions. Both prevent over-reaction while new capacity is not yet serving **[S10]**.
23. **Why does autoscaling lag a spike?** Metric collection interval, alarm evaluation, instance launch, boot, app start, health-check pass, and warmup. We measured about [X] s end-to-end.
24. **How does BBD handle that lag?** Predictable events use **scheduled/pre-warmed** capacity and **predictive** scaling instead of reactive-only. Flipkart is reported to pre-scale and rehearse **[S16]**.
25. **State the CAP theorem.** In the presence of a network partition, a distributed data store must choose between consistency and availability. Partition tolerance is not optional in practice.
26. **Apply CAP to e-commerce.** Product catalogue and cart favour availability (AP, eventual consistency). Inventory decrement and payments favour consistency (CP-like) to avoid overselling or double-charging. This is typical reasoning, not a statement about Flipkart's internals.
27. **What is eventual consistency?** Replicas converge if no new writes arrive. Reads may be stale for a short time. It is acceptable for browsing but not for stock counts at checkout.
28. **Why must the app be stateless?** Any instance must be able to serve any request, and instances may disappear at any time. Sessions go in a shared store or signed tokens, not instance memory.
29. **What is hybrid cloud?** Using private/own infrastructure together with public cloud, with workloads or bursts moving between them. Challenges: networking, identity, data gravity, consistent tooling, and latency between sites.
30. **What is cloud bursting?** Keeping the base load on own infra and overflowing to public cloud at peak. It works best for stateless tiers. Data-heavy services are hard to burst because of data gravity.

## 7.3 Cost and TCO (Q31–Q36)

31. **What is TCO?** All costs of ownership over a time horizon: hardware or instances, power, cooling, space, network, licences, staff, and replacement, minus residual value. Compare like for like over the same period.
32. **Capex vs opex?** Capex is upfront purchase (servers) amortised over their lifetime. Opex is pay-as-you-go. Cloud turns capex into opex.
33. **How did you model cost?** Instance-hours × hourly price + ALB hourly charge + LCU usage + data transfer **[S12]**, using the AWS Pricing Calculator for estimates and our measured instance-hours for actuals. Assumptions are in a table.
34. **When is own infrastructure cheaper?** At high, steady utilisation over multi-year horizons. The break-even utilisation is `capex_per_hour_amortised / cloud_price_per_hour`. Below that cloud wins.
35. **Why is hybrid cost-effective for BBD?** Own capacity is sized for the base load (high utilisation). The 6–8× burst is rented for hours rather than owned for a year **[S16]**.
36. **What costs did you leave out?** Staff, data egress at scale, CDN, DB, security tooling, reserved/spot discounts. State this honestly, along with how it biases the result.

## 7.4 The exercise (Q37–Q52)

37. **What did you build?** A web app on EC2 behind an ALB, in an ASG with a target-tracking policy, plus a k6 load generator on a separate instance, with results committed and plotted.
38. **Why this metric (response time vs instance count)?** It directly shows whether more capacity improves user-visible performance. We report percentiles because the mean hides tail latency, and BBD users feel the tail.
39. **Why p95/p99 rather than average?** Averages hide a slow minority. Tail latency compounds across microservice calls, and SLOs are usually written on percentiles.
40. **Why an open-model load test?** In a closed model, slower responses reduce the arrival rate (coordinated omission), hiding degradation. Flash-sale users arrive independently of the server's speed, so arrival-rate executors fit **[S11]**.
41. **How did you choose the load levels?** A capacity probe on one instance found the saturation point at about [X] req/s. Test loads were [1.5–2×] that, so that scaling would be observable.
42. **Why a CPU-bound endpoint?** It makes service time and CPU utilisation predictable, so CPU-based target tracking reacts. A trivial endpoint would be limited by the load generator or the network.
43. **How did you know the load generator was not the bottleneck?** k6 CPU stayed under [X]%, `dropped_iterations` was [0] **[S11]**, and client-side latency matched ALB `TargetResponseTime`.
44. **How many repeats and why?** Three per configuration. It is enough to see variance but not enough for strong statistics, so we report medians and IQR and say so.
45. **What went wrong?** [Fill in honestly, for example: burstable CPU credits throttled the 1-instance runs; the first ASG policy was too slow because warmup was default; the session expired mid-run.] How we found it: [CloudWatch `CPUCreditBalance` / logs]. Fix: [change].
46. **Did the results show scaling? If not, why?** [Yes up to N = X, then flat.] Rival explanations considered: client limit, shared bottleneck, credit throttling, warmup **[S7]**. Evidence for each: [table].
47. **What does the latency curve look like and why?** Latency drops steeply until capacity exceeds demand, then flattens because the queue is empty and service time dominates. Some curves show diminishing returns from shared resources.
48. **How long did scale-out take?** [X] s from the load step to the first new instance in service, and [Y] s until p95 returned under the SLO. It is the main weakness of reactive scaling for flash sales.
49. **How did scale-in behave?** It is deliberately conservative: scale-in waits for warmup and cooldown **[S10]**. This avoids flapping but costs a few extra instance-minutes.
50. **What would be your bottleneck at 10× load?** The database or shared state, ALB limits, and ASG launch rate. Our test has no DB, which is a limitation.
51. **Is your result generalisable to Flipkart?** No, only directionally. It supports the *mechanism* (horizontal scaling lowers tail latency, lag matters), not Flipkart's actual numbers.
52. **How is your live URL deployed, and how do you start it?** `[ALB DNS name]`, created by `[infra/script]`. Start: begin the lab, run the script, wait [X] min for health checks. Teardown: `[script]`.

## 7.5 Individual contribution and team (Q53–Q60)

53. **What exactly did you do?** [Three specific items with issue and PR numbers.] Examiners can check `git log --author`, so be accurate.
54. **Show me a commit of yours and explain it.** [Prepare two per member from different weeks, and explain the *why*.]
55. **Explain a part someone else built.** [Use your teach-back card. Start with the design decision, then the alternative, then one number.]
56. **Which decision did you disagree with, and how was it resolved?** [Real example, resolved by data or an ADR in `docs/adr/`.]
57. **What did you learn that surprised you?** [For example, how much of the lag was boot and warmup rather than metrics.]
58. **What would you do differently with 2 more weeks?** Add a database tier, run the hybrid (own node + cloud) experiment, test least-outstanding-requests, and use scheduled scaling.
59. **How did you review each other's work?** Rotating PR reviews, enforced by branch protection, with links to threads.
60. **How did you handle risks?** Risk register with owners. The two that actually occurred were [R2 and R3], and our mitigations were [x].

## 7.6 Curveballs and follow-ups (Q61–Q66)

61. **What if the ALB is the single point of failure?** The ALB is managed and multi-AZ by design, but we ran in [one AZ / two AZs]. Deploying across AZs removes the instance-level single point of failure.
62. **Why not serverless?** It would remove instance management and scale faster, but the exercise needs an observable *instance count* axis. Serverless is a good alternative for the stateless tier, and I would discuss it as future work.
63. **Why not Kubernetes?** It adds operational complexity beyond the course scope. Flipkart reportedly runs Kubernetes **[S16]**, and the HPA/Cluster Autoscaler concepts map directly onto ASG target tracking.
64. **Spot instances for burst?** They are cheaper but can be interrupted. They are fine for stateless workers with graceful handling, but risky for checkout paths.
65. **What is a CDN's role in BBD?** It absorbs static and cacheable traffic at the edge, which reduces origin load. The dynamic path still needs elastic compute.
66. **The demo failed. What now?** I state what it was meant to show and switch to the recorded backup and committed results **[S15]**, then explain the cause.

## 7.7 The 10-minute demo script

| Time | Who | Show | Say (essence) |
|---|---|---|---|
| 0:00–0:45 | C | Slide 1–2 | Case in 3 sentences, RQ, hypotheses. |
| 0:45–1:30 | C | Architecture diagram | "Request flow: user → ALB → ASG → instances; alarm → scale." |
| 1:30–2:30 | A | **Live URL** in browser, `/health`, `/work` | "This is deployed, public, behind an ALB." Refresh and show different instance IDs (round robin). |
| 2:30–3:30 | A | AWS console: ALB targets, ASG, policy | "Min [1], max [N], target [50%] CPU, warmup [X] s." |
| 3:30–4:30 | B | Terminal: k6 script and threshold | "Open model, ramp [0→X] req/s, p95 < [Y] ms." Start a *short* (2 min) run. |
| 4:30–6:00 | A + B | Console during run | Watch CPU rise and instance count increase. Narrate the lag. |
| 6:00–7:30 | B | Pre-rendered plots (F5, F6) | "p95 vs instances, error bars from 3 runs. Scale-out lag [X] s." |
| 7:30–8:30 | A | Cost slide | "Measured cost USD [X]. Extrapolated BBD-scale hybrid break-even at [Y]% utilisation." |
| 8:30–9:30 | C | Limitations and lessons | "What went wrong, what we'd change." |
| 9:30–10:00 | All | Repo history | Show commit graph and per-member contribution table. |

**Backup plan:** screen recording of the full demo on every laptop, the plots as PNG, and a local Docker stack. Run through the script twice, with a timer. If the live run goes badly, switch to the recording. The demo path must work even if the live scale-out takes longer than expected.

## 7.8 The 12-slide deck outline

1. **Title and team**, with roles and repo/live URLs.
2. **Problem and case**: BBD in one picture, with the key numbers and sources.
3. **Research question and hypotheses.**
4. **Case analysis (PACADI)**: alternatives and decision table.
5. **Architecture** (hybrid concept + exercise diagram).
6. **Experiment design**: E1/E2/E3, metrics, SLO, and why an open model.
7. **Implementation**: stack, IaC, config table, live demo pointer.
8. **Results 1**: response time vs instance count (F5).
9. **Results 2**: autoscaling time series and lag (F6).
10. **Cost and TCO**: measured and extrapolated, with break-even.
11. **What went wrong, limitations and validity**: the honest slide that earns credibility.
12. **Conclusion, recommendation and contributions**: answer to the RQ, per-member contributions, and Q&A.

Slide rules: one message per slide as the title, 30 words or fewer of body text, figures with large fonts, a speaker note for each, and each slide has an owner who can defend it.

---

# 8. Grading-Criteria Self-Checklist (likely rubric: *guessed*)

Weights are my estimate from published course rubrics **[S14]**. Replace them when the TAs share the real ones.

| Likely criterion | Guess | Evidence in your project | ✔ |
|---|---|---|---|
| **Case understanding and research quality**: sources, accuracy, triangulation, citations | 15% | Source table; every claim tagged; facts vs inference marked | [ ] |
| **Case analysis**: alternatives, criteria, justified recommendation | 10% | PACADI table; sensitivity to weights | [ ] |
| **Architecture and design**: diagram quality, justified choices (cf. UMD requirement for an architecture diagram) | 10% | C4/AWS diagrams, ADRs | [ ] |
| **Working implementation**: web app + LB + autoscaling truly functions (the 5% "working autoscaling" style item in published rubrics) | 15% | Live URL, ASG scale-out screenshot | [ ] |
| **Reproducibility / IaC / automation** (several courses reward Terraform/CDK automation) | 5–10% | Scripted setup, README in 5 steps, teardown | [ ] |
| **Experiments and measurement**: valid method, repeats, latency, scaling, cost | 15% | E1/E2/E3, thresholds, raw data in repo | [ ] |
| **Analysis and discussion**: interprets results, limitations, "what went wrong" | 10% | §9, rival explanations table | [ ] |
| **Cost awareness / budget discipline** (budget overrun penalised in one rubric) | 5% | Cost sheet, spend tracking | [ ] |
| **Report quality**: structure, clarity, figures, references, page limit | 10% | IEEE-style structure, figure checklist | [ ] |
| **GitHub practice**: regular meaningful commits, PRs, issues, per-member history | 10% | Commit graph spans all weeks; Conventional Commits | [ ] |
| **Weekly progress documents** reviewed by TAs | 5% | Five files, live links | [ ] |
| **Individual contribution** (peer and mentor review in some rubrics) | graded separately | Contribution table matches `git log` | [ ] |
| **Viva / presentation**: clarity, timing (10 min with Q&A), individual answers | 10–15% | Slides, demo, rehearsals | [ ] |
| **Live URL** works at evaluation | gate | Uptime log, backup | [ ] |

**Self-score before submission:** 0 = missing, 1 = partial, 2 = solid. Anything at 0 or 1 in the top-weighted rows gets a ticket.

---

# 9. Final Submission Checklist

**Repository**
- [ ] Public (or TAs added); description, topics, and live URL set in the About box
- [ ] README: summary, architecture PNG, live URL, run steps, team table, link to report
- [ ] Commit history spans Weeks 1–4, with all three members visible (run `git shortlog -sn` and check)
- [ ] No giant "final" commit, no force-push history rewrites, no secrets (`git log -p | grep -i "aws_secret"`)
- [ ] PRs merged with reviews; issues closed or explained; project board up to date
- [ ] Tag `v1.0-submission` pushed and the release page includes the PDF of the report
- [ ] `results/raw` and `results/processed` committed; every plot regenerates from `analysis/`

**Live system**
- [ ] URL loads over the public internet from a phone on mobile data
- [ ] `/health` returns 200; `/work` varies instance IDs across requests
- [ ] ASG policy visible; scale-out demonstrated at least once (screenshot or recording)
- [ ] Lab started ≥ 30 min before the viva; a startup and teardown runbook exists
- [ ] Fallback ready: recorded demo, GitHub Pages or static copy, local Docker stack

**Report**
- [ ] Within the page limit, with all sections from §2
- [ ] Abstract is ≤ 250 words, self-contained, with keywords **[S5]**
- [ ] All figures and tables numbered, captioned, referenced, readable in greyscale
- [ ] F5 (response time vs instance count) present, with units and repeats
- [ ] Cost section includes assumptions and measured values
- [ ] Limitations and "what went wrong" present
- [ ] References in IEEE numeric style; every web claim is cited; every reference is cited in the text
- [ ] Contributions table matches the git history; every member has read the whole report
- [ ] Proofread by a member who did not write the section; PDF exported and checked

**Weekly docs and process**
- [ ] Week 1 summary, Week 2 report, progress docs for Weeks 1–4 (Week 5 if applicable) all linked from `docs/progress/README.md`
- [ ] TA comments addressed and noted
- [ ] RACI and risk register updated with final status

**Viva (Week 5)**
- [ ] 12 slides, timed to 10 minutes, owner per slide
- [ ] Demo script rehearsed twice; recording stored on every laptop
- [ ] Each member can answer Q1–Q66 at level 2 for all areas (mock viva log in repo)
- [ ] Each member can show two own commits and one PR review, and explain them
- [ ] Laptop, charger, adapter, hotspot backup; AWS login tested; slides offline as PDF

**Cost and clean-up**
- [ ] Budget screen captured; all resources torn down after the final run (unless needed for the viva)
- [ ] No leftover ALBs or Elastic IPs billing

---

# Sources

Retrieved in this session. Items marked (snippet) were read from search-result excerpts rather than the full page.

- **[S1]** Conventional Commits 1.0.0 specification. https://www.conventionalcommits.org/en/v1.0.0/ (full page read)
- **[S2]** The C4 model for visualising software architecture (Simon Brown). https://c4model.com/ ; https://c4model.com/abstractions ; https://c4model.info/ (snippets)
- **[S3]** GitHub Docs, "GitHub flow", "Branches", "Creating a pull request". https://docs.github.com/en/get-started/using-github/github-flow (snippets)
- **[S4]** GitHub Docs, "About Projects" and "Best practices for Projects". https://docs.github.com/en/issues/planning-and-tracking-with-projects (snippets)
- **[S5]** IEEE Author Center, "Structure Your Paper" (conferences) and "Structure Your Article" (journals). https://conferences.ieeeauthorcenter.ieee.org/write-your-paper/structure-your-paper/ ; also EJUST IEEE student branch, "Paper Structure". https://edu.ieee.org/eg-ejust/paper-structure/ (snippets)
- **[S6]** Borsboom, O. & Salazar, M., "Guidelines for Writing Papers and Reports", TU/e, 2023. https://research.tue.nl/en/publications/e07b56c4-ff43-4f06-8265-1c0f0e0419b1 (snippet)
- **[S7]** Yin, R.K., *Case Study Research: Design and Methods*; Yin, "A (very) brief refresher on the case study method" (SAGE). https://study.sagepub.com/sites/default/files/a_very_brief_refresher_on_the_case_study_method.pdf ; Baxter, P. & Jack, S. (2008), "Qualitative Case Study Methodology: Study Design and Implementation for Novice Researchers", *The Qualitative Report*. https://doi.org/10.46743/2160-3715/2008.1573 (snippets)
- **[S8]** Weinstein, Brotspies & Gironda, "Do Your Students Know How to Analyze a Case—Really?" (PACADI), Harvard Business Impact, 2020; HSG "Case-Based Learning" summary of PACADI; HBS "The Case Method". https://www.hbsp.harvard.edu/inspiring-minds/a-framework-for-using-cases-to-help-students-become-better-decision-makers ; https://hdz.unisg.ch/fileadmin/user_upload/HSG_ROOT/Institut_HDZ/05_Services/Weitere_Materialien/CaseBasedLearning_HDZHSG.pdf ; https://www.hbs.edu/mba/academic-experience/the-case-method (snippets)
- **[S9]** AWS Academy Learner Lab Educator Guide; Student guide (josejuansanchez.org mirror); UQ CSSE6400 Learner Lab handout (4-hour session, budget lag). https://d1.awsstatic.com/AWS%20Academy%20Learner%20Lab%20Educator%20Guide.pdf ; https://josejuansanchez.org/iaw/taller-aws/resources/guia_aws_academy_learner_lab.pdf ; https://csse6400.uqcloud.net/handouts/learner-lab.pdf (snippets). *Budget size ($50 vs $100) and allowed services vary by class. Check your lab's Readme.*
- **[S10]** AWS, "Target tracking scaling policies", "Scaling cooldowns", "Default instance warmup" for Amazon EC2 Auto Scaling. https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html ; .../ec2-auto-scaling-scaling-cooldowns.html ; .../ec2-auto-scaling-default-instance-warmup.html (snippets)
- **[S11]** Grafana k6 docs: "Open and closed models", "Ramping arrival rate", "Arrival-rate VU allocation", "Thresholds". https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/ ; https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/ ; https://grafana.com/docs/k6/latest/using-k6/thresholds/ (snippets)
- **[S12]** AWS Pricing Calculator (product page and user guide); "AWS Pricing/TCO Tools" whitepaper section; Elastic Load Balancing pricing (hourly + LCU). https://aws.amazon.com/aws-cost-management/aws-pricing-calculator/ ; https://docs.aws.amazon.com/whitepapers/latest/how-aws-pricing-works/aws-pricingtco-tools.html ; https://aws.amazon.com/elasticloadbalancing/pricing/ (snippets). *The whitepaper is marked "historical reference", so confirm current prices in the calculator.*
- **[S13]** AWS Architecture Icons (https://aws.amazon.com/architecture/icons/); draw.io AWS diagrams (https://www.drawio.com/docs/diagram-types/aws-diagrams/); AWS Networking Best Practices, "Conventions" (PNG + draw.io source, readable at 700 px). https://aws.github.io/aws-networking-best-practices/community/conventions/ (snippets)
- **[S14]** Example course rubrics (used to *guess* yours): FH Cloud Computing 2020, grading and project work (https://fh-cloud-computing.github.io/grading/ ; .../projectwork/); EC528 Cloud Computing grading, incl. individual contribution, peer evaluation, 10-minute demo + 5 min Q&A (https://ec528.github.io/ec528/fall26/grading/); UMD CMSC389L final project (architecture diagram, load-testing credit) (https://umd-cs-stics.gitbooks.io/cmsc389l-practical-cloud-computing-spring-2018/content/final-project/); CS 40 Cloud Application Deployment final project (IaC, elasticity, load distribution) (https://infracourse.cloud/assignments/project/) (snippets)
- **[S15]** Viva guidance: Projectech, "How to Prepare for Your Final-Year Project Viva" (https://projectech.in/guides/project-viva-defense-preparation/); Khatib, "83 Final Year Project Viva Questions" (https://yaseenkhatib.streamerosai.com/final-year-projects/question-bank/); Projectium Research, "CS Engineering Project Viva Questions" (https://www.projectiumresearch.com/2026/06/cs-engineering-project-viva-questions.html) (snippets). *Practitioner blogs, not academic sources. Use for style, not facts.*
- **[S16]** Flipkart/BBD facts: Google Cloud Blog, "Flipkart's DX journey" (30 Oct 2023: 6–8× BAU volume during BBD, self-managed data centres, migration to Google Cloud) https://cloud.google.com/blog/products/data-analytics/flipkarts-dx-journey-to-futureproof-its-platform ; Mint (12 Oct 2018), "Hidden AI hand that drives online mega shopping days" (2014 crashes, 25× traffic, new DC and private cloud, 15× traffic simulation) https://www.livemint.com/Technology/ELSZdws9vVHxAWVUQPmoJK/Hidden-AI-hand-that-drives-online-mega-shopping-days.html ; Dataquest (23 Oct 2015), "How Flipkart prepared itself for the Big Billion day" (months of preparation, code freeze, supply-chain capacity) https://www.dqindia.com/how-flipkart-prepared-itself-for-the-big-billion-day/ ; Aerospike blog (4 Nov 2025: 90M QPS across three data centres) https://aerospike.com/blog/flipkart-journey-90-million-qps/ ; CNCF case study (Kubernetes and VM workloads; chaos engineering for BBD) https://www.cncf.io/case-studies/flipkart/ (snippets). *Vendor and press sources: cite as "reported by", and cross-check before use.*

*Not verified: the contents of your course PDF, AWS prices (use the Calculator on the day), and whether instances in your Learner Lab survive session expiry in an ASG. Test that last one in Week 1 (issue #4).*
