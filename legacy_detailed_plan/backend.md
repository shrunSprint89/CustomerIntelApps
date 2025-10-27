# Backend architecture and decisions (Simplified for MVP Phase 1)

Purpose
This document details backend/API decisions for the MVP, emphasizing a Supabase-first approach: auth, endpoints, job orchestration, security, scaling, testing and monitoring. It complements [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1) and [`docs/archDecisions/mvp.md`](docs/archDecisions/mvp.md:1).

Summary
- Primary language: TypeScript (Deno/Node.js for Supabase Functions/Edge Functions)
- Deploy: Supabase Edge Functions for API endpoints and webhooks; Supabase Functions for background workers.
- Auth: Supabase Auth (JWT) + server-side Row-Level Security and policies.
- Queue: Postgres-based job queue within Supabase Postgres for background tasks.
- Worker: Supabase Functions (serverless, stateless, idempotent) for all heavy processing.

Design principles
- Keep API surface minimal, leveraging Supabase's capabilities (PostgREST, Edge Functions).
- Treat LLM invocations and heavy research as asynchronous jobs, orchestrated by Supabase Functions.
- Enforce evidence-first outputs: all claims include sources and retrieval scores.
- Secure by design: verify tokens, apply RLS, never expose provider keys.
- Maximize Supabase ecosystem for minimal operational overhead.

Authentication & sessions
- Use Supabase Auth for user identity and session management. Frontend uses Supabase JS client; Supabase Edge Functions/Functions validate Supabase JWT on each request.
- Admin/service operations should leverage Supabase service role keys with appropriate RLS policies.
- Token verification: Handled natively by Supabase for RLS; custom validation in Edge Functions if needed for specific logic.

API surface (core endpoints via Supabase Edge Functions/PostgREST)
- **Supabase PostgREST:** Provides RESTful API endpoints directly from Postgres tables for most CRUD operations (e.g., `projects`, `icp_reports`).
- **Supabase Edge Functions:**
  - POST `/generate_icp` (or similar trigger) -> Accepts project inputs, creates `icp_report` in DB, and enqueues job in `jobs` table (which can trigger a Supabase Function worker).
  - GET `/reports/:id` -> Retrieves report metadata and JSON output.
  - POST `/reports/:id/export` -> Enqueues PDF rendering job.
  - GET `/reports/:id/download` -> Provides signed URL for PDF from Supabase Storage.
  - POST `/webhooks/stripe` -> Stripe webhook handler (verify signature, trigger order fulfillment).
  - POST `/webhooks/razorpay` -> Razorpay webhook handler (verify signature, trigger order fulfillment).
  - Other custom endpoints requiring specific server-side logic beyond PostgREST.

Idempotency & reliability
- Generation endpoints can utilize idempotency keys passed through to the job queue within Postgres.
- Supabase Functions workers should be designed to be idempotent.
- Job processing within Supabase Functions should include retry logic managed by the job queue.

Job lifecycle & schema
- `icp_reports` table: id, project_id, status (queued/running/failed/ready), prompt_inputs, output_json (nullable), pdf_url, created_at, updated_at
- `jobs` table (Postgres-based queue): id, type, payload, status, attempts, last_error, created_at (Supabase Functions can poll or be triggered by this table).
- `sources` table: id, report_id, source_url, snippet, domain, retrieval_score, created_at
- `embeddings_meta` table: (now the primary for vector storage with `pgvector`) id, chunk_id, embedding `vector(1536)`, created_at

Background workers (Supabase Functions)
- Responsibilities: fetch/scrape sources, chunk and embed text (via LLM Adapter), upsert to `pgvector` in Supabase Postgres, retrieve top-k snippets (from `pgvector`), call LLM adapter, assemble structured ICP, persist output, trigger PDF rendering.
- Workers run as Supabase Functions, triggered by new entries in the `jobs` table or direct API calls from Edge Functions.
- Use built-in retry mechanisms of the job queue and design functions for resilience.

LLM & provider adapter (Supabase Function)
- All provider calls are made server-side via an adapter service deployed as a Supabase Function.
- Adapter responsibilities: abstract model provider (primarily OpenRouter), add retry/pacing, batching of embeddings, cost logging, usage quotas.

Data integrity & storage strategy
- Master data (projects, users, reports, billing, and now vector embeddings) stored in Supabase Postgres (with `pgvector`).
- Raw crawled content stored in Supabase Storage with reference id in Postgres.

Webhooks & external integration patterns
- Stripe/Razorpay webhooks are directly handled by Supabase Edge Functions, which verify signatures and update user plans/trigger notifications via functions.
- Supabase Functions can handle long-running integration tasks or external API calls.

Rate limiting and quotas
- Frontend API calls can be rate-limited by Vercel or custom logic in Supabase Edge Functions.
- Application-level quotas (generations/month) managed in Supabase Postgres and enforced by Edge Functions/Functions.

Security considerations
- Secrets stored in Supabase Secrets or injected as environment variables into Functions/Edge Functions.
- Supabase Row-Level Security (RLS) is paramount for data access control.
- HMAC verify webhooks in Edge Functions and use signed URLs for Supabase Storage.
- Input validation and sanitization for all user inputs.
- Principle of least privilege for Supabase service roles.

Observability & monitoring
- Leverage Supabase native logging (`Postgres logs`, `Functions logs`).
- Errors reported to Sentry from Functions/Edge Functions with context (user_id, project_id, job_id).
- Metrics for Supabase Function invocations, execution times, LLM error rate, and cost-per-job.

Testing & contract validation
- Unit tests for Supabase Function/Edge Function logic.
- Integration tests simulating End-to-End flows using the Supabase client libraries.
- Contract tests for Supabase Functions <-> Edge Functions interactions.

CI/CD & deployments
- GitHub Actions pipeline: lint, tests, build, and deploy Supabase Functions/Edge Functions via Supabase CLI.
- Use environment-specific config leveraging Supabase project environments.

Error handling patterns
- Supabase Functions can return structured errors.
- Retry transient errors in job queue; record failure reasons in `jobs` table for admin review.

Data privacy & compliance
- Leverage Supabase RLS and data retention features.
- Mask PII in logs and provide opt-out for training data reuse.

Alternative patterns & tradeoffs (revisited)
- Consolidating on Supabase Functions/Edge Functions: simplifies deployment and reduces ops compared to external cloud functions or container orchestration like Cloud Run/Fargate. May require adapting Node.js code to Deno runtime where applicable for Edge Functions.
- Postgres-based queue: simpler to manage than external Redis/BullMQ for MVP; scales with Postgres. May not offer the same advanced features as dedicated queue systems but is sufficient for MVP.

Operational runbook highlights (Supabase-centric)
- LLM provider outage: Supabase Function (LLM Adapter) logic to switch to a backup OpenRouter endpoint or fallback model.
- Handling queue overload: Monitor `jobs` table depth; scale Supabase Functions or implement application-level circuit breakers via Edge Functions.

Next steps
- Implement Supabase Edge Functions for API endpoints.
- Develop Supabase Functions for all worker tasks (ingestion, embeddings, LLM calls, PDF rendering).
- Adapt existing database schemas, especially `embeddings_meta`, to fully utilize `pgvector`.

References
- [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- [`docs/archDecisions/mvp.md`](docs/archDecisions/mvp.md:1)
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)
- [`docs/archDecisions/vector-store-choice.md`](docs/archDecisions/vector-store-choice.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25