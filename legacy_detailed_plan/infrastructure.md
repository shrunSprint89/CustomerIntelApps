# Infrastructure, hosting & CI/CD (Simplified for MVP Phase 1)

Purpose
This document describes the recommended infrastructure, hosting choices, CI/CD pipelines, and secrets management for the Phase 1 MVP, emphasizing maximum integration with Supabase and Vercel for operational simplicity and cost-efficiency.

Scope
- Hosting and runtime for frontend, Supabase Edge Functions, and Supabase Functions (workers)
- CI/CD (GitHub Actions) for all components
- Secrets management and configuration
- Backups and disaster recovery considerations within Supabase
- Cost-aware choices for Phase 1 (low ops, Supabase-centric)

Assumptions
- Phase 1 target: ~1k MAU, peak concurrency ~50; keep ops minimal and use managed services.
- Preferred stack (Phase 1): Vercel (frontend), Supabase (Auth + Postgres with `pgvector` + Storage + Edge Functions + Functions), OpenRouter (LLM).
- CI: GitHub Actions.
- Single-cloud approach through Supabase for backend services.

High-level topology
- **Frontend:** Next.js deployed to Vercel (CDN + edge). Marketing pages and core application UI.
- **Backend APIs & Webhooks:** Supabase Edge Functions for handling API requests and external webhooks (e.g., payments).
- **Background Workers:** Supabase Functions for all long-running and heavy tasks (ingestion, embedding, LLM invocation, PDF rendering).
- **Database (Relational & Vector):** Supabase Postgres for all relational data and vector embeddings (`pgvector`).
- **Object Storage:** Supabase Storage for raw crawled pages, uploaded docs, and generated PDFs.
- **Secrets:** Supabase Secrets (for Supabase project-level secrets) and Vercel Environment Variables (for frontend-specific secrets).
- **Observability:** Supabase native logging, Sentry for error tracking, custom metrics via Supabase Function logs or integrated services.

Environments & isolation
- Environments: dev, staging, prod. Use separate Supabase projects for staging vs prod where possible.
- Access control: Supabase Row-Level Security (RLS) is key for data access, along with appropriate Supabase service roles.

CI/CD design (GitHub Actions)
- Repo layout: monorepo with `/web` (Next.js), `/supabase` (Supabase Functions/Edge Functions), `/infra` (minimal scripts if needed).
- Workflows:
  - `pull_request`: lint, typecheck, unit tests for all components; Vercel preview deployments for frontend.
  - `merge to main`:
    - Frontend: Deploy Next.js app to Vercel.
    - Supabase Functions/Edge Functions: Build and deploy via Supabase CLI.
    - Database: Apply Supabase CLI database migrations.

Secrets & configuration management
- **Supabase Secrets:** Primary storage for backend secrets (e.g., OpenRouter API keys) deployed directly to Supabase projects.
- **Vercel Environment Variables:** For frontend-specific environment variables.
- Local development: `.env.example` in repo; actual secrets kept out of source control.

Container builds & registries (N/A – replaced by Supabase Functions/Edge Functions)
- Supabase manages deployment of Functions/Edge Functions. No explicit container orchestration is done by the user.

Backups & Disaster Recovery
- **Supabase Postgres:** Automated daily backups and point-in-time recovery (PITR) with configurable retention, managed by Supabase.
- **Supabase Storage:** Managed by Supabase. Enable versioning for objects if needed.
- DR Playbook: Focus on leveraging Supabase's managed backup and restore features.

Scaling & cost controls
- **Phase 1:** Maximize serverless and managed services from Supabase (Functions, Edge Functions, Postgres).
- **Autoscaling:** Supabase Functions and Edge Functions automatically scale based on demand.
- **Throttling:** Implement application-level throttles on LLM/embedding calls via Supabase Functions/Edge Functions.
- **Caching & reuse:** Cache embeddings and retrieval results in Supabase Postgres.
- **Cost monitoring:** Utilize Supabase billing alerts and dashboards; track LLM usage within Supabase Functions.

High availability & resilience patterns
- Circuit-breakers for LLM provider failures within the LLM Adapter (Supabase Function); fallback logic implemented.
- Dead-letter queue for failed jobs implemented within the Postgres-based job queue (`jobs` table).
- Health checks for Supabase Functions/Edge Functions are managed by Supabase.

Observability & logging touchpoints
- **Logging:** Centralized logs for Supabase Functions and Edge Functions (`console.log`, `console.error`) are available via Supabase dashboard. Structured JSON logs recommended.
- **Error tracking:** Sentry integrated with Supabase Functions/Edge Functions for error reporting with context.
- **Metrics:** Leverage Supabase dashboard metrics for Function invocations/duration; custom business metrics logged to Supabase and exposed via dashboards.
- **Tracing:** OpenTelemetry integration will need custom instrumentation within Supabase Functions/Edge Functions.

Security & compliance alignment
- Supabase-managed features: VPC (if available), Row-Level Security (RLS), TLS for all endpoints.
- WAF: Not directly managed, consider if Vercel (frontend) offers one.
- Audit logging: Supabase provides audit logs; custom audit logs can be stored in Supabase Postgres.

Deployment & release practices
- Vercel for frontend.
- Supabase CLI for deploying backend changes to Functions/Edge Functions and managing database migrations.

Local development experience
- Supabase CLI (`supabase start`) for local Postgres, Storage, Edge Functions, and Functions. This simplifies mocking and local testing significantly.
- Seed data: Include sample ICP reports for development and testing.

Cost estimation & budgeting guidance (Phase 1)
- Vercel: $0–$40 (Hobby/Pro).
- Supabase: Estimated $25–$150 initially (depending on Postgres scale, Function invocation count, Storage). This replaces costs for separate Redis, Pinecone, and server hosting.
- OpenRouter: Variable based on LLM usage. Expected $200–$700/mo.
- Total (conservative): Aim under $1,000/mo for a highly utilized MVP due to Supabase consolidation.

Runbooks & incident handling
- LLM outage: LLM Adapter (Supabase Function) switches to backup models/providers.
- DB incident: Leverage Supabase's managed restore features.
- Payment webhook failures: Replay from `jobs` table, or dedicated `webhook_events` table in Supabase Postgres.
- Queue overload: Monitor `jobs` table depth; Supabase Functions scale automatically, but application-level circuit breakers may be needed.

Acceptance criteria
- All components (frontend, Edge Functions, Functions, database) deploy automatically via CI.
- Preview deployments available for frontend PRs.
- Supabase-managed backups are configured and verified.
- Secrets managed via Supabase Secrets/Vercel ENV.

Next steps
- Provide a `supabase` directory structure.
- Refine GitHub Actions workflows for Supabase CLI deployment.

References
- [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)
- [`docs/archDecisions/backend.md`](docs/archDecisions/backend.md:1)
- [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)
- [`docs/archDecisions/integrations.md`](docs/archDecisions/integrations.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25