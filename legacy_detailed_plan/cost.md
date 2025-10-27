# Cost model & scaling plan (Simplified for MVP Phase 1)

Purpose
This document outlines the cost model, example estimates for Phase 1, cost-optimization tactics, monitoring and budget controls, and a scaling plan for Phase 2, aligning with the Supabase-first simplified architecture.

Scope & assumptions
- Phase 1 target: ~1k MAU, ~1k ICP reports/month (conservative). Budget target: < $1,000/month.
- Phase 2: scale to 10k–50k MAU; consider further architectural shifts for extreme scale.
- **Revised Baseline stack:** Vercel (frontend with SaaS starter), Supabase (Postgres with `pgvector` + Auth + Storage + Edge Functions + Functions), OpenRouter (LLM + embeddings), Sentry (observability).

Cost categories
1.  **LLM (inference & tokens):**
    -   Major cost driver. Includes prompt and completion tokens for generation and embeddings.
    -   Leverage OpenRouter to select cost-effective models.
    -   Use provider billing dashboards and instrument token usage: see metric `llm_request_tokens_total` in [`docs/archDecisions/observability.md`](docs/archDecisions/observability.md:1).
2.  **Supabase Core (Postgres + pgvector + Auth + Functions + Edge Functions + Storage):**
    -   Consolidated cost for relational database, vector database (`pgvector`), authentication, background workers, API endpoints, and object storage.
    -   Cost depends on Postgres database size/usage, Supabase Function/Edge Function invocations and execution time, and storage usage. Pricing is tiered and scales with usage.
3.  **Frontend hosting (Vercel):**
    -   CDN egress can increase with larger traffic and assets. Basic plans are often free/low-cost.
4.  **Observability (Sentry, integrated with Supabase logs):**
    -   Costs grow with retained logs and traces; apply sampling, especially from Supabase Functions/Edge Functions.
5.  **Third-party services (Stripe, Razorpay, transactional email providers):**
    -   Transactional fees per payment; separate from platform cloud costs.

Example Phase 1 (baseline) estimate — conservative (Revised)
- Assumptions:
  - 1,000 ICP reports/month
  - Average embeddings per report: 2000 tokens worth; generation tokens: 3000 tokens/report (varies a lot)
  - Embedding model cost and LLM cost combined estimate (via OpenRouter): $0.20–$0.80 per report (varies heavily by model)
- Monthly line items (approximate ranges):
  - **LLM tokens & embeddings (OpenRouter):** $200 — $700 (dependent on model choice via OpenRouter adapter)
  - **Supabase (Postgres + pgvector + Auth + Functions + Edge Functions + Storage):** $50 — $200 (replaces Pinecone, Cloud Run, Redis. Assumes reasonable function invocations and DB size)
  - **Vercel (frontend):** $0 — $40
  - **Observability (Sentry integrated with Supabase):** $10 — $100 (depends on retention and log volume)
  - **Misc & payment fees:** $10 — $50
- **Total conservative:** $270 — $1,090 / month. With careful token optimization, competitive OpenRouter models, and efficient Supabase Function usage, aiming for well under $1,000 is feasible.

Cost-optimization strategies (immediate / Phase 1)
1.  **Reduce LLM tokens:**
    -   Prompt engineering: concise system and few-shot prompts.
    -   Use smaller, cheaper models via OpenRouter for routine tasks (e.g., embeddings with cheaper models), reserve most capable models for high-value outputs.
2.  **Cache embeddings and retrievals:**
    -   Hash chunks (`chunk_hash`) and reuse embeddings across reports (stored in Supabase Postgres).
3.  **Progressive generation modes:**
    -   Offer "fast" (low token, small retrieval set) vs "deep" (paid); this limits baseline token burn.
4.  **Batch embedding requests:**
    -   Use provider batch APIs to reduce per-request overhead within Supabase Functions.
5.  **Limit scraping scope:**
    -   Use curated source lists and user-provided sources before wide web crawling.
6.  **Implement quotas and throttles:**
    -   Per-user monthly credits; warn on approaching limits; apply rate-limits via Supabase Edge Functions.
7.  **Telemetry sampling:**
    -   Reduce observability egress costs by sampling traces and downsampling logs after 30 days within Supabase logging.

Medium-term / Phase 2 cost levers
1.  **Optimize Supabase Function usage:** Refine function execution patterns, cold start optimization.
2.  **Explore dedicated vector hardware:** If `pgvector` becomes a bottleneck at massive scale, re-evaluate dedicated vector databases (like Pinecone) or specialized Postgres extensions for performance.
3.  **Hybrid self-hosting for inference:** Host open-weight models on GPU instances for cheaper per-token cost at high volume (requires ops & GPUs).
4.  **Use multi-model routing:** Route cheap models for drafts and higher-end models for final outputs via OpenRouter.

Billing model & product pricing recommendations
1.  Freemium onboarding:
    -   Free tier: e.g., 3 free "fast" ICP reports and limited daily queries.
2.  Pay-per-report credits:
    -   Offer single report purchase — price should reflect average LLM cost + margin (e.g., $5–$20 per deep report depending on length).
3.  Subscription plans:
    -   Basic ($/month) with N reports / month and limited "deep" credits
    -   Pro with increased capacity, team seats and priority generation
4.  Enterprise:
    -   Custom pricing with dedicated infrastructure, data residency, or onsite models
5.  Consider adding usage-based components:
    -   Charge for token-heavy features (deep research), or charge extra for private document processing

Instrumentation for cost tracking
- Capture token usage per run: store as `token_usage` in `icp_reports.token_usage`.
- Emit metrics (via Supabase Functions logs that can be scraped or processed):
  - `llm_request_tokens_total` (labels: model, plan)
  - `cost_estimate_per_report_usd` (Gauge) — compute using current model pricing
- Build a cost dashboard: predicted monthly burn, spend by customer, top consumers, trendlines using Supabase monitoring or integrated tools.
- Alert on sudden cost spikes or burn rate exceeding daily budget thresholds.

Automated budget controls & governance
- Daily spend ceiling with auto-throttling when approaching limits (logic within Supabase Edge Functions/Functions).
- Auto-disable "deep" mode for free users when budget exceeded.
- Admin override with auditing for exceptional runs.

Migration & scale plan (operational checklist)
Stage 0 — Prove concept (Phase 1)
- Use Supabase for everything (Postgres + `pgvector`, Functions, Edge Functions) and OpenRouter for LLMs.
- Implement quotas & cost monitoring.
Stage 1 — Optimize (mid-scale)
- Evaluate and optimize Supabase Function performance and costs.
- Further refine `pgvector` indexing and query performance in Postgres.
Stage 2 — Scale (high volume)
- Introduce self-hosted LLM inference in hybrid mode if OpenRouter costs become prohibitive at extreme scale.
- Potentially evaluate dedicated vector DBs (like Pinecone) if `pgvector` becomes a bottleneck for latency or specific features at very high volumes.

Risk register (cost-related)
- LLM cost overrun: mitigations — quotas, cheaper models (via OpenRouter), caching.
- Supabase resource bills: mitigations — optimize Postgres queries, efficient Function execution, data retention policies.
- Observability bill spike: mitigations — reduce retention, sample more.

Acceptance criteria
- Cost dashboard shows predicted monthly burn and breakdown by major services.
- Quotas and auto-throttles implemented to prevent runaway costs.
- Alerts configured for >20% day-over-day spend increase and for per-model token spikes.

Next steps
- Implement token accounting and `icp_reports.token_usage` persistence.
- Build cost dashboard and alerting rules (link to billing metrics).
- Finalize pricing experiments and run a small paid beta.

References
- [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)
- [`docs/archDecisions/infrastructure.md`](docs/archDecisions/infrastructure.md:1)
- [`docs/archDecisions/observability.md`](docs/archDecisions/observability.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25