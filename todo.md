# TODO — MVP Phase 1 Implementation

This repository-level todo mirrors the `update_todo_list` state. Keep it updated after each set of tasks (see [`.roo/rules/rules.md`](.roo/rules/rules.md:1)).

The architecture is defined in `docs/archDecisions` and the plan is to implement the 4-week MVP. After each task is completed, progress should be committed following the workflow in [`.roo/rules/rules.md`](.roo/rules/rules.md:1).

- [x] **Architecture & Planning:** Consolidate legacy plans into the new simplified, Supabase-first architecture.
  - [x] Finalize `docs/archDecisions/simplified-architecture.md`
  - [x] Finalize `docs/archDecisions/mvp-plan.md`
  - [x] Finalize `docs/archDecisions/cross-cutting-concerns.md`
- [ ] **Week 0: Setup & Skeleton**
  - [ ] Provision accounts: Vercel, Supabase, OpenRouter, Stripe/Razorpay.
  - [ ] Create monorepo layout: `/web` (Next.js SaaS starter), `/supabase` (Functions/Edge Functions).
  - [ ] Establish CI/CD skeleton in GitHub Actions for Vercel and Supabase CLI.
- [ ] **Week 1: Core Auth & Job Enqueue**
  - [ ] Implement Supabase Auth using SaaS starter UI.
  - [ ] Implement Project CRUD via Supabase PostgREST/Edge Functions.
  - [ ] Implement job enqueue endpoint (`/api/generate_icp`) using a Supabase Edge Function.
- [ ] **Week 2: RAG Pipeline**
  - [ ] Implement LLM Adapter (Supabase Function) for OpenRouter.
  - [ ] Implement source ingestion, chunking, and embedding pipeline (Supabase Function).
  - [ ] Implement RAG retrieval from `pgvector` and LLM invocation (Supabase Function).
  - [ ] Persist `icp_reports` and `provenance_mappings` to Supabase Postgres.
- [ ] **Week 3: Payments, PDF Export & UI**
  - [ ] Integrate Stripe and Razorpay payments with Supabase Edge Function webhooks.
  - [ ] Implement PDF export worker (Supabase Function).
  - [ ] Enhance frontend with a provenance display panel and job status updates.
- [ ] **Week 4: Testing, Tuning & Stabilization**
  - [ ] Add unit tests for key Supabase Functions/Edge Functions.
  - [ ] Develop E2E smoke tests for the core user flow.
  - [ ] Implement basic token accounting and per-user quotas.

Last updated: 2025-10-28 by Roo