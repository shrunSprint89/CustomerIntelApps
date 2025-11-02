# TODO — MVP Phase 1 Implementation

This repository-level todo mirrors the `update_todo_list` state. Keep it updated after each set of tasks (see [`.roo/rules/rules.md`](.roo/rules/rules.md:1)).

The current architecture and build plan are fully defined in the [`docs/archDecisions`](docs/archDecisions) folder:
- [`simplified-architecture.md`](docs/archDecisions/simplified-architecture.md:1): **Supabase-first backend, Next.js SaaS starter frontend, OpenRouter as LLM adapter.** Evidence provenance, quotas, cost-control, and payment adapters (Stripe, Razorpay) are mandatory across all flows.  
- [`mvp-plan.md`](docs/archDecisions/mvp-plan.md:1): **4-week detailed MVP roadmap, project structure, and functional requirements.** Phased approach with weekwise deliverables and acceptance checklist.
- [`cross-cutting-concerns.md`](docs/archDecisions/cross-cutting-concerns.md:1): **Cost, observability, CI/CD, and integration requirements.** Focus on Supabase logs, Sentry, quota/rate-limiting, automatable cost controls.

**Key priorities and changes applied:**
- All backend (API, workers, DB, object storage, auth) via Supabase; frontend via SaaS starter (Next.js/React/TypeScript).
- LLM/embeddings via OpenRouter, abstracted by a Supabase Function "LLM Adapter".
- MVP includes: provenance-first ICP gen, payments (Stripe, Razorpay), PDF export, editable evidence panel, quota/cost controls, and E2E test coverage.
- Payments/entitlements, evidence, and core flows must work for global (Stripe) and INR/local (Razorpay/UPI).
- Quotas enforced via Supabase Edge Functions/RLS; job queuing/post-processing fully managed in Supabase Postgres.

---

## WIP — MVP 4-Week Roadmap

### ✅ Architecture & Planning
- [x] Consolidate legacy plans into the new simplified Supabase-first architecture.
- [x] Finalize [`simplified-architecture.md`](docs/archDecisions/simplified-architecture.md:1)
- [x] Finalize [`mvp-plan.md`](docs/archDecisions/mvp-plan.md:1)
- [x] Finalize [`cross-cutting-concerns.md`](docs/archDecisions/cross-cutting-concerns.md:1)

### ⏳ Week 0: Setup & Skeleton
- [ ] Provision accounts: Netlify, Supabase, OpenRouter, Stripe, Razorpay. (Observability will be self-hosted Signoz).
- [ ] Create monorepo layout: `/web` (Next.js SaaS starter on Netlify), `/supabase` (Supabase Functions/Edge Functions), `/infra` (if needed).
- [ ] Establish CI/CD skeleton (GitHub Actions for Netlify & Supabase CLI).
- [ ] Seed representative test inputs.

### ⏳ Week 1: Core Auth, Projects, Enqueue
- [ ] Implement Supabase Auth using SaaS starter UI.
- [ ] Implement Project CRUD (Supabase PostgREST + Edge Functions API, minimal UI).
- [ ] Implement job enqueue endpoint: `/api/generate_icp` (Supabase Edge Function that creates an `icp_report` and enqueues a job in `jobs`).
- [ ] Create minimal Supabase Function worker (logs/enqueues jobs).

### ⏳ Week 2: Ingestion, Embeddings & RAG Pipeline
- [ ] Implement ingestion Connectors: direct PDF/DOCX upload & simple Typeform/Tally webhook.
- [ ] Implement chunking, deduplication, embedding computation using OpenRouter (via LLM Adapter Supabase Function).
- [ ] Store all data in Supabase Postgres/pgvector: `embeddings_meta`, `icp_reports`, `provenance_mappings`.
- [ ] Implement RAG retrieval and LLM prompt/response pipeline in worker.
- [ ] UI: add forms for seed input, basic outputs, and provenance review.

### ⏳ Week 3: Payments, PDF Export, UI Enhancement
- [ ] Integrate Stripe and Razorpay payments (Edge Function webhooks & frontend flows).
- [ ] Implement entitlement checking and gating for free/paid users and quota limits.
- [ ] Implement PDF export (Supabase Function).
- [ ] Enhance UI: provenance evidence panel, job status updates (Supabase Realtime/polling).

### ⏳ Week 4: Testing, Quotas, E2E & Stabilization
- [ ] Add unit tests for Supabase Functions/Edge Functions and LLM Adapter.
- [ ] Add E2E smoke tests for core flows (Playwright).
- [ ] Implement token usage accounting and per-user quotas via Edge Functions/RLS.
- [ ] Testing/validation: output schema, provenance mapping, quotas, payments.
- [ ] Admin minimal dashboard (Supabase/logs).

---

_Last updated: 2025-11-01 by Roo_