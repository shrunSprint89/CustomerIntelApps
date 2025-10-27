# Phase 1 Dev Checklist — RAG-based ICP Generator (4-week accelerated, Supabase-first)

Purpose
Provide clear developer tasks to deliver Phase 1: RAG-based ICP JSON generation + provenance within 4 weeks, aligning with the simplified, Supabase-first architecture. This checklist maps to the refined architecture and roadmap.

Success criteria
- Users can sign up, create a project, submit seed input, and receive structured ICP JSON with provenance stored in Supabase Postgres.
- Generated JSON conforms to schema and includes source citations.
- Unit & E2E tests for core flows pass in CI.
- Basic token accounting and per-user quotas in place, cost-controlled via OpenRouter.

Minimal deliverables (MUST)
1.  **Auth & Projects:**
    -   Integrate auth using Supabase Auth (leveraging SaaS starter template UI).
    -   Implement Project CRUD via Supabase PostgREST and Edge Functions where needed.
2.  **Generate API endpoint:**
    -   Supabase Edge Function (e.g., `api/generate_icp`) accepts seed inputs, creates `icp_report` in DB, and enqueues job in Postgres-based `jobs` table, triggering a Supabase Function.
3.  **Supabase Functions (Workers):**
    -   Implement Supabase Functions for all worker tasks: source ingestion, chunking, embedding, retrieval, LLM invocation, result persistence (to Supabase Postgres), and PDF generation.
4.  **LLM Adapter (OpenRouter-centric):**
    -   Implement LLM Adapter as a Supabase Function (`supabase/functions/llm-adapter.ts`) that calls OpenRouter for both embeddings and generation.
    -   Store prompt templates (e.g., `ml/prompts/icp_v1.json`) within the Supabase functions project.
5.  **Persistence (Supabase Postgres with `pgvector`):**
    -   Ensure `icp_reports` table has fields: `id`, `project_id`, `status`, `output_json`, `token_usage`.
    -   `embeddings_meta` table uses `pgvector` to store embeddings for RAG.
    -   `provenance_mappings` table stores source citations for evidence.
6.  **Frontend minimal UI (Next.js with SaaS Starter):**
    -   Leverage SaaS starter for user auth, dashboard.
    -   Provide a form to submit seed inputs and a viewer to display `output_json` and provenance.
7.  **Testing & CI:**
    -   Add unit tests for Supabase Functions/Edge Functions and LLM Adapter.
    -   E2E smoke test: signup -> generate -> retrieve report.
    -   CI workflow skeleton: `.github/workflows/ci.yml` (for Vercel & Supabase CLI deployments).

Implementation tasks (prioritized)

MUST (week 1)
-   [ ] Setup environment and secrets (OpenRouter API keys, Supabase dev project, Vercel).
-   [ ] Implement Supabase Auth (via Supabase JS client/SaaS starter UI) and Project CRUD (Supabase PostgREST/Edge Functions).
-   [ ] Implement `/api/generate_icp` Edge Function (enqueue job in Postgres-based `jobs` table).
-   [ ] Create skeleton for Supabase Function worker that logs received jobs.

SHOULD (week 2)
-   [ ] Implement LLM Adapter (Supabase Function) for OpenRouter (embeddings + generation).
-   [ ] Implement source ingestion, chunking, and `pgvector` upsert within a Supabase Function worker.
-   [ ] Implement RAG logic: `pgvector` retrieval and prompt construction within a Supabase Function worker.
-   [ ] Implement basic JSON schema validation and error handling in Supabase Functions.
-   [ ] Persist `icp_reports.output_json`, `icp_reports.token_usage`, and `provenance_mappings`.
-   [ ] Start integrating frontend SaaS starter template; implement seed form and JSON viewer for ICP.

NICE TO HAVE (week 3)
-   [ ] Add token accounting and per-user quotas enforcement via Supabase.
-   [ ] Add basic admin metrics page for total reports and token spend (using Supabase analytics/logs).
-   [ ] Implement PDF export via a Supabase Function.
-   [ ] Enhance frontend UI for provenance display and job status updates (Supabase Realtime/polling).
-   [ ] Add Playwright E2E tests and integrate into CI.

Dev notes: Prompt engineering
-   Use strict system instruction with OpenRouter: output only valid JSON matching schema.
-   Add few-shot examples in the prompt for better structure.
-   Include "confidence" attribute per claim; instruct model to mark "low" if uncertain.
-   Keep prompts concise to reduce token cost; test multiple variants via OpenRouter.

Observability & safety
-   Log job lifecycle events with `request_id` and `trace_id` in Supabase logs; capture token usage.
-   Implement rate limits and quotas to prevent runaway costs, enforced by Supabase Edge Functions/Functions.
-   Do not send sensitive PII to LLM unless explicit consent; mask before sending.

Local dev & mock mode
-   Use `supabase start` for local Postgres, Storage, Edge Functions, and Functions.
-   Provide mock LLM responses within the LLM Adapter for offline development.

Timeline mapping (4 weeks)
Week 1: Env, auth, projects, enqueue, worker scaffold (MUST).
Week 2: RAG pipeline (ingestion, embeddings, `pgvector`, retrieval, LLM call) and result persistence (SHOULD).
Week 3: Frontend UX (SaaS starter, provenance, PDF export), token accounting, quotas, initial tests (NICE).
Week 4: E2E hardening, prompt tuning, SLAs, prepare beta release.

Acceptance checklist (to close Phase 1)
-   10 representative sample inputs produce schema-valid JSON with provenance in CI.
-   Token usage recorded per report.
-   Senior Engineer reviewed outputs and approved model prompts.
-   CI passes E2E smoke tests.
-   Payment flows for basic subscription/one-off successfully processed.

Next steps after Phase 1
-   Add more advanced connectors and integrations as required.
-   Further optimize Supabase Function performance and cost scaling.

Owner: Roo (architect/coder)
Last updated: 2025-10-25