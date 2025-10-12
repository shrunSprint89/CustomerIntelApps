# Roadmap: Phase 1 MVP (4-week accelerated) & Phase 2 Plan

Purpose
This roadmap updates the Phase 1 timeline to deliver a working ICP JSON generator within 1 month, reflecting the available team: 1 senior engineer (review), Roo-code agent (orchestrator/architect/coder/debugger) working continuously, and 1 PM.

References
- Requirements: [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- Architecture overview: [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- ML pipeline: [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- Data model: [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)
- Integrations: [`docs/archDecisions/integrations.md`](docs/archDecisions/integrations.md:1)
- Infra: [`docs/archDecisions/infrastructure.md`](docs/archDecisions/infrastructure.md:1)

Accelerated Goal
- Deliver a robust ICP JSON generation pipeline (RAG + LLM) with provenance stored in the database within 4 weeks (30 days).
- Provide minimal UI to submit seeds and view JSON output; defer PDF export and advanced connectors until after JSON milestone.

Success criteria (30-day target)
- Users can sign up, create a project, submit seed input, and receive a structured ICP JSON with provenance stored in `provenance_mappings`.
- Generated JSON conforms to the schema and includes source citations for major claims.
- Basic quotas and cost controls prevent runaway LLM spend.

Team & roles (current)
- Senior Engineer — reviews code, security sign-offs, critical integration testing (part-time).
- Roo-code agent (this automation) — orchestrator/architect/coder/debugger; available daily including weekends to perform scaffolding, coding, prompt engineering, and tests.
- Product Manager (PM) — product decisions, prioritization, user testing coordination.

Assumptions for accelerated schedule
- Roo-code agent performs the majority of implementation and iteration; Senior Engineer focuses on review and critical decisions.
- PM provides seed inputs and coordinates beta test cases and review cycles.

4-week plan (high level)

Week 0 (2–3 days) — Setup & skeleton
- Provision accounts: Vercel, Supabase, Pinecone, OpenAI (sandbox), Stripe/Razorpay.
- Create repo layout and CI skeleton; create `/web`, `/api`, `/workers`, `/infra`.
- Seed test inputs and share examples with PM for validation.
- Deliverable: dev environment and CI skeleton.

Week 1 — Core auth, project model, enqueue (7 days)
- Integrate Supabase Auth (signup/login minimal).
- Implement Project CRUD (API + minimal UI).
- Implement job enqueue API and a basic worker scaffold (Redis + BullMQ).
- Deliverable: create project and enqueue ICP jobs.

Week 2 — Ingestion & embeddings (7 days)
- Implement ingestion for URLs and file uploads (simple extractor or mocked ingestion).
- Chunking, deduplication, compute embeddings via OpenAI adapter, upsert to Pinecone (dev index).
- Persist sources and chunks into Postgres.
- Deliverable: embeddings stored and retrievable.

Week 3 — Retrieval & JSON generation (7 days)
- Implement retrieval (top-k), assemble prompt with snippets, LLM adapter to generate structured JSON.
- Persist `icp_reports.output_json` and `provenance_mappings`.
- Add server-side JSON schema validation and quick UI to display JSON output.
- Deliverable: structured ICP JSON with provenance for representative inputs.

Week 4 — Testing, tuning & stabilization (7 days)
- Add unit tests and E2E smoke tests (signup -> enqueue -> report ready).
- Prompt tuning to improve accuracy and reduce hallucinations.
- Implement basic token accounting and per-user quotas; add simple admin metrics.
- Deliverable: Release candidate for JSON-generation milestone.

Minimal scope & tradeoffs
- Focused on JSON output; PDF export, full provenance editing UI, and payments can be deferred briefly to reduce risk.
- Use managed Pinecone and OpenAI for speed; optimize prompts and caching to control cost.

QA & validation
- PM to provide 10 representative seed inputs (including sample ICP PDF).
- Automated regression tests to check output schema and presence of provenance.
- Senior Engineer will review sample outputs daily and approve readiness.

Post-30-day actions
- Week 5–6: Add provenance review UI and basic PDF export skeleton.
- Week 7–8: Integrate payments (Stripe/Razorpay) and finalize admin reporting.
- Continue beta with selected users and iterate.

Risks & mitigations
- LLM cost: enforce quotas and reserve "deep" runs for paid users; monitor token usage.
- Hallucination: require evidence mapping and expose low-confidence flags.
- Integration blockers: fallback to mock adapters and defer non-critical connectors.

Acceptance checklist
- Structured ICP JSON generated and stored for sample inputs.
- Provenance mapping recorded for major claims.
- E2E tests pass in CI.
- Senior Engineer has reviewed and signed off critical flows.

Notes on continuous development
- Roo-code agent will iterate daily; PRs reviewed by Senior Engineer.
- PM coordinates beta users and feedback cycles.

Document owner: Roo (architect)
Last updated: 2025-10-12