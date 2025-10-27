# Cross-Cutting Concerns for MVP Phase 1

## Purpose
This document consolidates key cross-cutting concerns for MVP Phase 1, including cost, observability, integrations, and infrastructure. It aligns with the simplified, Supabase-first architecture, leveraging a Next.js SaaS starter template and OpenRouter for LLM integration.

## 1. Cost Model & Scaling Plan

### Scope & Assumptions
-   **Phase 1 Target:** ~1k MAU, ~1k ICP reports/month (conservative). Budget target: < $1,000/month.
-   **Revised Baseline Stack:** Vercel (frontend with SaaS starter), Supabase (Postgres with `pgvector` + Auth + Storage + Edge Functions + Functions), OpenRouter (LLM + embeddings), Sentry (observability).

### Cost Categories
1.  **LLM (Inference & Tokens):** Major cost driver. Leveraging OpenRouter for model selection and cost-effective embeddings.
2.  **Supabase Core:** Consolidated cost for relational/vector database (`pgvector`), authentication, background workers (Functions), API endpoints (Edge Functions), and object storage.
3.  **Frontend Hosting (Vercel):** Basic plans are low-cost; scales with CDN egress.
4.  **Observability (Sentry):** Costs grow with logs/traces retention; apply sampling.
5.  **Third-Party Services:** Transactional fees (Stripe, Razorpay, transactional email).

### Example Phase 1 (Baseline) Estimate — Conservative (Revised)
-   **LLM Tokens & Embeddings (OpenRouter):** $200 — $700/month.
-   **Supabase (Consolidated):** $50 — $200/month (replaces Pinecone, Cloud Run, Redis).
-   **Vercel (Frontend):** $0 — $40/month.
-   **Observability (Sentry integrated):** $10 — $100/month.
-   **Misc & Payment Fees:** $10 — $50/month.
-   **Total Conservative:** $270 — $1,090/month. Aim for well under $1,000/month with optimization.

### Cost-Optimization Strategies (Immediate / Phase 1)
-   **Reduce LLM Tokens:** Prompt engineering, use smaller/cheaper models (via OpenRouter), progressive generation modes ("fast" vs. "deep").
-   **Caching:** Hash chunks and reuse embeddings across reports (stored in Supabase Postgres).
-   **Batching Requests:** Use provider batch APIs for embeddings within Supabase Functions.
-   **Throttling & Quotas:** Per-user monthly credits, rate-limits via Supabase Edge Functions.
-   **Telemetry Sampling:** Reduce observability egress costs.

### Medium-Term / Phase 2 Cost Levers
-   Optimize Supabase Function usage.
-   Explore dedicated vector hardware or specialized Postgres extensions beyond `pgvector` if `pgvector` becomes a bottleneck.
-   Hybrid self-hosting for LLM inference at high volume if OpenRouter costs become prohibitive.
-   Multi-model routing via OpenRouter to route cheap models for drafts.

### Automated Budget Controls & Governance
-   Daily spend ceiling with auto-throttling via Supabase Functions/Edge Functions.
-   Auto-disable "deep" mode for free users if budget exceeded.

## 2. Observability & Monitoring

### Scope
-   Structured logging, correlation, and retention.
-   Metrics collection, naming conventions, and analysis.
-   Distributed tracing (OpenTelemetry) for Supabase Functions/Edge Functions.
-   Synthetic checks, uptime, and end-to-end smoke tests.
-   Alerting, SLOs, dashboards, and runbooks.

### Observability Pillars (Supabase-centric)
1.  **Logging:** Structured JSON logs for all services (Edge Functions, Functions, Next.js). Centralized log ingestion (Supabase logs integrated with Sentry), PII masking, request_id propagation.
2.  **Metrics:** Track performance (e.g., `icp_generation_duration_seconds`), requests (`icp_generation_requests_total`), LLM usage (`llm_request_tokens_total`), queue depth (`worker_job_queue_depth`), `pgvector` query latency.
3.  **Distributed Tracing (OpenTelemetry):** Instrument critical spans (HTTP, DB queries, LLM calls, PDF rendering) across Next.js and Supabase Functions/Edge Functions. Use W3C Trace Context for propagation.
4.  **Synthetics & Health Checks:** Basic health endpoints; end-to-end smoke tests for ICP generation.
5.  **SLOs, Error Budgets & Alerts:** Define availability SLOs (e.g., 99.9% for core), alert thresholds (e.g., error rates, queue depth, LLM cost spikes). Alert destinations: PagerDuty/Opsgenie, Slack, Email.

### Instrumentation & Correlation
-   **Next.js:** Instrument API routes and SSR.
-   **Supabase Functions/Edge Functions:** Explicit spans around expensive operations (embedding, `pgvector`, LLM calls). Record attributes (model_name, mode, token_usage).
-   **Correlation:** Generate `request_id` at ingress, propagate through Supabase Functions. Use `trace_id/span_id` for deep correlation.

### Dashboard & Visualization
-   Use Supabase Analytics or a connected tool (e.g., Grafana) for dashboards: Platform Health, ICP pipeline, LLM usage, Job Queue, DB metrics. Sentry for errors/performance.

### Runbooks & Incident Handling
-   Defined runbooks for common incidents: high job queue backlog, LLM provider outage (adapter failover), cost spikes.

## 3. Integrations — Payments, Connectors, and Webhooks

### Scope
-   **Payments:** Stripe (global) + Razorpay (India) for one-off and subscriptions.
-   **Connectors:** Direct file uploads (PDF/DOCX), basic webhook-driven form connectors (Typeform/Tally).
-   **Webhooks:** Robust handling via Supabase Edge Functions.
-   **Messaging:** Telegram bot for notifications.
-   **Transactional Email:** Via a managed provider (e.g., Resend, often integrated with SaaS starter).
-   **Analytics & Marketing:** Google Analytics, Tag Manager, Metapixel for marketing attribution.
-   **Affiliate Marketing:** Platform for tracking and managing affiliate programs.

### Principles
-   Favor managed providers; keep provider-specific logic behind adapter interfaces (especially for payments).
-   Secure token storage (Supabase Secrets), signature verification (Edge Functions), idempotency, and observability for all integration flows.
-   Explicit user consent for processing user content.

### Payments (Phase 1)
-   **Providers:** Stripe (global cards, subscriptions), Razorpay (INR, UPI, local wallets).
-   **Implementation:** SaaS starter template handles Stripe UI. Razorpay custom integration for INR/UPI. Supabase Edge Functions for webhook verification and entitlement processing. Currency handling stores prices in smallest unit, supporting multi-currency display.

### Connector Patterns (Phase 1)
-   **Direct Uploads:** Ingested and processed by a Supabase Function (validation, text extraction, chunking, embedding, `pgvector` indexing). Explicit consent required.
-   **Webhook-driven Connectors (Typeform/Tally):** Supabase Edge Function receives and verifies webhooks, triggers Supabase Function worker for processing and indexing.

### Messaging / Cohort Channels
-   **Telegram (Phase 1):** Bot API for notifications and invites, handled by a Supabase Function.

### Webhook Handling Design (Supabase Edge Functions)
-   Generic receiver pattern (`/api/v1/webhooks/{provider}`).
-   Signature verification (Stripe, Razorpay).
-   Idempotency (provider event ID, Postgres `webhook_events` table).
-   Enqueue raw payload to Postgres-based job queue for asynchronous processing by Supabase Functions.
-   Automated retries and Dead-Letter Queue (DLQ) for failed webhook jobs.

### Security & Token Management
-   Encrypt tokens in Supabase Secrets; access tokens only to Supabase Functions/Edge Functions.
-   Token refresh/rotation.

## 4. Infrastructure, Hosting & CI/CD

### High-Level Topology
-   **Frontend:** Next.js on Vercel (CDN + Edge).
-   **Backend:** Fully Supabase-centric (Edge Functions, Functions, Postgres with `pgvector`, Auth, Storage).

### Environments & Isolation
-   Dev, Staging, Prod environments. Use separate Supabase projects for isolation.
-   Access control via Supabase RLS and service roles.

### CI/CD Design (GitHub Actions)
-   **Monorepo Layout:** `/web` (Next.js), `/supabase` (Edge Functions, Functions).
-   **Workflows:**
    -   `pull_request`: Lint, typecheck, unit tests, frontend preview deployments (Vercel).
    -   `merge to main`: Deploy Next.js to Vercel. Deploy Supabase Functions/Edge Functions via Supabase CLI. Apply Supabase CLI database migrations.

### Secrets & Configuration Management
-   **Supabase Secrets:** Primary storage for backend secrets (e.g., OpenRouter API keys).
-   **Vercel Environment Variables:** For frontend-specific environment variables.
-   Local `.env.example`, actual secrets out of source control.

### Backups & Disaster Recovery
-   **Supabase Postgres:** Automated daily backups (PITR) managed by Supabase.
-   **Supabase Storage:** Managed by Supabase (versioning possible).

### Scaling & Cost Controls
-   **Phase 1:** Maximize serverless and managed Supabase services.
-   **Autoscaling:** Supabase Functions and Edge Functions scale automatically.
-   **Throttling:** Application-level LLM/embedding call throttles.
-   **Cost Monitoring:** Supabase billing alerts, dashboards, LLM usage tracking.

### High Availability & Resilience
-   Circuit-breakers (LLM Adapter), Dead-Letter Queue (Postgres), Supabase-managed health checks.

### Security & Compliance Alignment
-   Supabase-managed TLS, RLS, audit logs. Input validation and least privilege.

### Local Development Experience
-   Supabase CLI (`supabase start`) for a full local environment (Postgres, Storage, Edge Functions, Functions).
-   Mock LLM responses within the LLM Adapter for offline development.

## References
- [`docs/archDecisions/simplified-architecture.md`](docs/archDecisions/simplified-architecture.md:1)
- [`docs/archDecisions/mvp-plan.md`](docs/archDecisions/mvp-plan.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25