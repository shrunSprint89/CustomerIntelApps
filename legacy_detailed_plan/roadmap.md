# Roadmap: Phase 1 MVP (4-week accelerated, Supabase-first) & Phase 2 Plan

Purpose
This roadmap outlines the updated Phase 1 timeline to deliver a working ICP JSON generator with RAG and provenance within 4 weeks. It reflects the available team: 1 senior engineer (review), Roo-code agent (orchestrator/architect/coder/debugger) working continuously, and 1 PM, all aligning with the simplified, Supabase-first architecture.

References
- Requirements: [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- Architecture overview: [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- ML pipeline: [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- Data model: [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)
- Integrations: [`docs/archDecisions/integrations.md`](docs/archDecisions/integrations.md:1)
- Infra: [`docs/archDecisions/infrastructure.md`](docs/archDecisions/infrastructure.md:1)

Accelerated Goal
- Deliver a robust ICP JSON generation pipeline (RAG + OpenRouter LLM) with provenance stored in Supabase Postgres within 4 weeks (30 days).
- Provide minimal UI leveraging a SaaS starter template to submit seeds and view JSON output; PDF export integrated within this timeframe.

Success criteria (30-day target)
- Users can sign up, create a project, submit seed input, and receive a structured ICP JSON with provenance stored in `provenance_mappings` in Supabase.
- Generated JSON conforms to the schema and includes source citations for major claims.
- Basic quotas and cost controls (via OpenRouter LLM adapter) prevent runaway LLM spend.
- Core payment flows (Stripe/Razorpay) are functional for subscription and one-off purchases.

Team & roles (current)
- Senior Engineer — reviews code, security sign-offs, critical integration testing (part-time).
- Roo-code agent (this automation) — orchestrator/architect/coder/debugger; available daily including weekends to perform scaffolding, coding, prompt engineering, and tests.
- Product Manager (PM) — product decisions, prioritization, user testing coordination.

Assumptions for accelerated schedule
- Roo-code agent performs the majority of implementation and iteration; Senior Engineer focuses on review and critical decisions.
- PM provides seed inputs and coordinates beta test cases and review cycles.

4-week plan (high level)

Week 0 (2–3 days) — Setup & skeleton
- Provision accounts: Vercel, Supabase project, OpenRouter, Stripe/Razorpay.
- Create monorepo layout: `/web` (Next.js with SaaS starter), `/supabase` (Edge Functions, Functions for workers), `/infra` (minimal scripts/CLI).
- Seed test inputs and share examples with PM for validation.
- Deliverable: dev environment set up with Supabase CLI and Vercel connected.

Week 1 — Core auth, project model, enqueue (7 days)
- Integrate Supabase Auth (leveraging SaaS starter template UI).
- Implement Project CRUD (Supabase PostgREST & Edge Functions API + minimal UI).
- Implement job enqueue via Supabase Edge Function that creates a record in the Postgres-based `jobs` table (triggering a Supabase Function worker).
- Deliverable: User can create a project and initiate an ICP generation job.

Week 2 — Ingestion, embeddings & RAG (7 days)
- Implement source ingestion (Supabase Function for web scraping/document upload).
- Chunking, deduplication, compute embeddings via LLM Adapter (OpenRouter) on a Supabase Function.
- Upsert embeddings to Supabase Postgres with `pgvector`.
- Implement RAG retrieval (query `pgvector`), assemble prompt with snippets, and call OpenRouter LLM via the adapter on a Supabase Function to generate structured JSON.
- Deliverable: ICP structured JSON generated with RAG, provenance stored in `provenance_mappings`.

Week 3 — Payments, PDF export & UI Enhancements (7 days)
- Integrate Payments: Stripe (via SaaS starter) + Razorpay (custom UI) with Supabase Edge Functions handling webhooks for entitlement.
- Build PDF templates and implement PDF export (Supabase Function worker).
- Add provenance panel in UI (via SaaS starter template customization).
- Implement job status updates in frontend (Supabase Realtime/polling).
- Deliverable: Functional payment flows, PDF export, and enhanced UI for ICP review.

Week 4 — Testing, tuning & stabilization (7 days)
- Add unit tests for Supabase Functions/Edge Functions and E2E smoke tests (signup -> generate -> retrieve report -> payment).
- LLM prompt tuning to improve accuracy and reduce hallucinations, leveraging OpenRouter flexibility.
- Implement basic token accounting and per-user quotas (Supabase Edge Functions/RLS); add simple admin metrics (based on Supabase analytics).
- Deliverable: Release candidate for MVP, ready for beta testing.

Minimal scope & tradeoffs
- Focused on JSON output with provenance and integrated payment flows.
- Uses Supabase and OpenRouter for cost-efficiency and operational simplicity.
- Leverages SaaS starter template to accelerate common UI components.

QA & validation
- PM to provide 10 representative seed inputs (including sample ICP PDF).
- Automated regression tests to check output schema and presence of provenance.
- Senior Engineer will review sample outputs daily and approve readiness.

Post-30-day actions
- Week 5–6: Further enhance connectors, add more content generation features.
- Week 7–8: Integrate advanced analytics, explore A/B testing frameworks.
- Continue beta with selected users and iterate.

Risks & mitigations
- LLM cost: enforce quotas and reserve "deep" runs for paid users; monitor token usage via OpenRouter adapter.
- Hallucination: require RAG grounding (`pgvector`), attach source snippets; expose low-confidence flags.
- Integration blockers: use Supabase Edge Functions for webhooks, implement adapter patterns for external providers.

Acceptance checklist
- Structured ICP JSON generated and stored for sample inputs with provenance.
- E2E tests pass in CI.
- Senior Engineer has reviewed and signed off critical flows.
- Core payment flows and subscription gating functionality.

Notes on continuous development
- Roo-code agent will iterate daily; PRs reviewed by Senior Engineer.
- PM coordinates beta users and feedback cycles.

Document owner: Roo (architect)
Last updated: 2025-10-25