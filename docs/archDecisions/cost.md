# Cost model & scaling plan

Purpose
This document outlines the cost model, example estimates for Phase 1, cost-optimization tactics, monitoring and budget controls, and a scaling plan for Phase 2.

Scope & assumptions
- Phase 1 target: ~1k MAU, ~1k ICP reports/month (conservative). Budget target: < $1,000/month.
- Phase 2: scale to 10k–50k MAU; consider self-hosting and architectural shifts.
- Baseline stack: Vercel (frontend), Supabase (Postgres + Storage), Pinecone (vector DB), OpenAI (LLM + embeddings), Cloud Run (workers), Redis (queue), Sentry/Grafana (observability).

Cost categories
1. LLM (inference & tokens)
 - Major cost driver. Includes prompt and completion tokens for generation and embeddings.
 - Use provider billing dashboards and instrument token usage: see metric `llm_request_tokens_total` in [`docs/archDecisions/observability.md`](docs/archDecisions/observability.md:1).
2. Vector DB (Pinecone)
 - Cost depends on index size (vectors), pod tier, and QPS.
3. Relational DB (Supabase Postgres)
 - Base monthly plan + storage; scale with larger plans.
4. Frontend hosting (Vercel)
 - CDN egress can increase with larger traffic and assets.
5. Worker compute (Cloud Run / Fargate)
 - Pay per CPU / memory and execution time; PDF rendering and scraping are heavy.
6. Queue & cache (Redis)
 - Managed Redis cost related to instance size.
7. Storage & CDN (S3 / Supabase Storage)
 - Store raw crawled pages, uploads, and generated PDFs.
8. Observability (Sentry, Grafana Cloud, logs)
 - Costs grow with retained logs and traces; apply sampling.
9. Third-party services (Stripe, Razorpay, email providers)
 - Transactional fees per payment; separate from platform cloud costs.

Example Phase 1 (baseline) estimate — conservative
- Assumptions:
  - 1,000 ICP reports/month
  - Average embeddings per report: 2000 tokens worth; generation tokens: 3000 tokens/report (varies a lot)
  - Embedding model cost and LLM cost combined estimate: $0.20–$0.80 per report (varies heavily by provider & model)
- Monthly line items (approximate ranges):
  - LLM tokens & embeddings: $200 — $700
  - Pinecone (starter index + queries): $50 — $200
  - Supabase (Auth + Postgres + Storage): $25 — $100
  - Vercel (frontend): $0 — $40
  - Cloud Run workers + Redis: $10 — $100
  - Storage & bandwidth (S3/Supabase): $10 — $50
  - Observability (Sentry/Grafana logs): $10 — $150 (depends on retention)
  - Misc & payment fees: $10 — $50
- Total conservative: $315 — $1,390 / month. With careful token optimization and caching aim for under $1,000.

Cost-optimization strategies (immediate / Phase 1)
1. Reduce LLM tokens:
  - Prompt engineering: concise system and few-shot prompts.
  - Use smaller models for routine tasks (e.g., embeddings with cheaper models), reserve most capable models for high-value outputs.
2. Cache embeddings and retrievals:
  - Hash chunks (`chunk_hash`) and reuse embeddings across reports (see [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)).
3. Progressive generation modes:
  - Offer "fast" (low token, small retrieval set) vs "deep" (paid); this limits baseline token burn.
4. Batch embedding requests:
  - Use provider batch APIs to reduce per-request overhead.
5. Limit scraping scope:
  - Use curated source lists and user-provided sources before wide web crawling.
6. Implement quotas and throttles:
  - Per-user monthly credits; warn on approaching limits; apply rate-limits.
7. Telemetry sampling:
  - Reduce observability egress costs by sampling traces and downsampling logs after 30 days.

Medium-term / Phase 2 cost levers
1. Move embeddings to pgvector:
  - If Pinecone cost becomes dominant, using pgvector (hosted in Postgres) can reduce costs at the expense of management and scaling complexity.
2. Hybrid self-hosting for inference:
  - Host open-weight models on GPU instances for cheaper per-token cost at high volume (need ops & GPUs).
3. Use multi-model routing:
  - Route cheap models for drafts and higher-end models for final outputs.
4. Multi-tenant index strategy:
  - Separate namespaces or indexes for high-volume customers to control cost distribution.

Billing model & product pricing recommendations
1. Freemium onboarding:
  - Free tier: e.g., 3 free "fast" ICP reports and limited daily queries.
2. Pay-per-report credits:
  - Offer single report purchase — price should reflect average LLM cost + margin (e.g., $5–$20 per deep report depending on length).
3. Subscription plans:
  - Basic ($/month) with N reports / month and limited "deep" credits
  - Pro with increased capacity, team seats and priority generation
4. Enterprise:
  - Custom pricing with dedicated infrastructure, data residency, or onsite models
5. Consider adding usage-based components:
  - Charge for token-heavy features (deep research), or charge extra for private document processing

Instrumentation for cost tracking
- Capture token usage per run: store as `token_usage` in [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1) `icp_reports.token_usage`.
- Emit metrics:
  - llm_request_tokens_total (labels: model, plan)
  - cost_estimate_per_report_usd (Gauge) — compute using current model pricing
- Build a cost dashboard: predicted monthly burn, spend by customer, top consumers, trendlines
- Alert on sudden cost spikes or burn rate exceeding daily budget thresholds

Automated budget controls & governance
- Daily spend ceiling with auto-throttling when approaching limits
- Auto-disable "deep" mode for free users when budget exceeded
- Admin override with auditing for exceptional runs

Migration & scale plan (operational checklist)
Stage 0 — Prove concept (Phase 1)
- Use managed services (OpenAI, Pinecone, Supabase) and keep aggressive caching
- Implement quotas & cost monitoring
Stage 1 — Optimize (mid-scale)
- Migrate heavy cached data to cheaper storage tiers
- Evaluate pgvector for cost savings; benchmark Pinecone vs pgvector
Stage 2 — Scale (high volume)
- Introduce self-hosted LLM inference in hybrid mode
- Consider sharded/multi-region index design and dedicated clusters

Risk register (cost-related)
- LLM cost overrun: mitigations — quotas, cheaper models, caching
- High Pinecone bills: mitigations — move to pgvector or optimize index retention
- Observability bill spike: mitigations — reduce retention, sample more

Acceptance criteria
- Cost dashboard shows predicted monthly burn and breakdown by major services
- Quotas and auto-throttles implemented to prevent runaway costs
- Alerts configured for >20% day-over-day spend increase and for per-model token spikes

Next steps
- Implement token accounting and `icp_reports.token_usage` persistence
- Build cost dashboard and alerting rules (link to billing metrics)
- Finalize pricing experiments and run a small paid beta

References
- [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)
- [`docs/archDecisions/infrastructure.md`](docs/archDecisions/infrastructure.md:1)

Owner: Roo (architect)
Last updated: 2025-10-11