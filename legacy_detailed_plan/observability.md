# Observability & Monitoring (Simplified for MVP Phase 1)

Purpose
This document describes the observability strategy for the ICP generator platform, aligning with the Supabase-first simplified architecture: logging, metrics, distributed tracing, synthetic checks, alerts, dashboards, and runbooks required to operate Phase 1 (MVP).

Scope
- Structured logging, correlation, and retention from Supabase services.
- Metrics collection, naming conventions, and analysis from Supabase and OpenRouter.
- Distributed tracing guidance for Supabase Functions/Edge Functions.
- Synthetic checks, uptime, and end-to-end smoke tests.
- Alerting, SLOs and incident runbooks.
- Dashboards, cost controls (especially for OpenRouter), and sampling strategy.

Observability pillars
1.  **Logging**
    -   Use structured JSON logs for all services (Supabase Edge Functions, Supabase Functions, Next.js).
    -   Core fields: timestamp, level, service, env, trace_id, span_id, request_id, user_id, project_id, job_id, message, error, meta.
    -   Recommendations:
        -   Do not log secrets or raw PII; mask or redact before writing.
        -   Centralize log ingestion to a managed provider (e.g., Supabase logs integrated with Sentry or a custom solution).
        -   Use a correlation id (request_id) generated at the edge and propagated through all Supabase Functions.

2.  **Metrics**
    -   Key metrics to track (derived from Supabase logs and custom instrumentation):
        -   `icp_generation_duration_seconds` (Histogram) — buckets for latency analysis of Supabase Functions.
        -   `icp_generation_requests_total{status="success|failure",mode="fast|deep"}` (Counter) — tracked within Supabase Functions/Edge Functions.
        -   `llm_request_count_total{model="…",provider="openrouter"}` (Counter)
        -   `llm_request_errors_total{model,provider}` (Counter)
        -   `llm_request_tokens_total` (Counter) — token usage from OpenRouter; label by model and `user_plan`.
        -   `worker_job_queue_depth` (Gauge) — Derived from `jobs` table in Supabase Postgres.
        -   `pgvector_query_latency_seconds` (Histogram) — Tracked for Supabase Postgres `pgvector` queries.
        -   `supabase_function_invoke_total` (Counter) and `supabase_function_duration_seconds` (Histogram) for overall Supabase Function health.
    -   Labeling guidance:
        -   Use low-cardinality labels on metrics (service, env, region, model, user_plan).
        -   Avoid high-cardinality labels (user_id/project_id) on aggregated metrics; use them on logs or sampled traces only.

3.  **Distributed Tracing**
    -   Standardize on OpenTelemetry (OTEL) where possible across Next.js and Supabase Functions (Node/TS for Deno runtime).
    -   Instrument critical spans:
        -   HTTP request (Next.js edges or Supabase Edge Functions).
        -   Database queries (Supabase Postgres, including `pgvector`).
        -   Postgres job queue operations (enqueue/dequeue from `jobs` table).
        -   Embedding batch (`embed_batch`) from LLM Adapter.
        -   `pgvector` upsert / query (`pgvector_upsert / pgvector_query`).
        -   LLM call (`llm_call`) — include model, prompt size, token counts as attributes (within LLM Adapter).
        -   PDF rendering (`pdf_render`) from Supabase Functions.
    -   Propagation: Use W3C Trace Context for trace propagation and include `trace_id` in logs across services.
    -   Sampling: Capture all error traces. Use adaptive sampling for high-throughput flows and keep a small percentage of successful traces.
    -   Backend: OTEL Collector -> Jaeger/Tempo or managed tracing backend (Grafana Cloud, Lightstep).

4.  **Synthetics & Health Checks**
    -   Health endpoints: Basic health checks exposed by Supabase Edge Functions/Functions.
    -   Synthetic checks: Periodic end-to-end smoke tests simulating an "ICP generation" run.
    -   Uptime monitoring for critical Supabase services.

5.  **SLOs, Error Budgets & Alerts**
    -   Example SLOs:
        -   99.9% availability for auth and project/project listing endpoints (monthly).
        -   95% of "fast" ICP requests complete under 30s.
    -   Alerting thresholds (examples):
        -   Error rate from Supabase Functions/Edge Functions > 1% over 5m -> P1 alert.
        -   Postgres job queue depth > (worker_capacity * 2) for 10m -> P1 alert.
        -   OpenRouter error rate > 5% or sudden token cost spike -> P1.
        -   Long-running job (> configured threshold) -> P2.
    -   Alert destinations: PagerDuty / Opsgenie, Slack, Email.
    -   Escalation policy: Define on-call rotations and tie alerts to runbooks.

Instrumentation guidance (implementation)
-   **Next.js:** Instrument API routes and SSR.
-   **Supabase Functions/Edge Functions (Node.js/TypeScript for Deno):**
    -   Use `@opentelemetry/sdk-node` and instrumentations for http, pg.
    -   Create explicit spans around expensive operations (embedding batch, `pgvector` query, LLM call).
    -   Record attributes: `model_name`, `mode` (fast|deep), `top_k`, `retrieval_count`, `token_usage`.
    -   Emit custom metrics via logging if direct Prometheus export is challenging in Deno/Edge.
-   **LLM/Embedding Adapter:** Instrument external calls to OpenRouter with retries and record latency, error count, and token consumption; surface these as metrics and spans.

Correlation & metadata
- Generated `request_id` at the frontend or Supabase Edge Function ingress, propagated to all downstream Supabase Functions and logs.
- Use `trace_id/span_id` for deep correlation between logs and traces.
- Attach `user_id/project_id` to logs and traces when available.

Logging: structure, retention & privacy
- Structured logs (JSON) for all Supabase services, collected and managed by Supabase.
- Minimal retention defaults: Prod logs: 90 days. Staging logs: 30 days. Traces: 30 days.
- PII masking before indexing logs.
- Record consent metadata when processing user documents.

Dashboard & visualization recommendations
- Dashboards to implement within Supabase Analytics or a connected tool like Grafana:
  - Platform Health (availability, error rate, avg latency)
  - ICP pipeline (requests by mode, median/95th latency, success rate)
  - LLM provider (requests, errors, tokens, estimated cost from OpenRouter)
  - Job Queue & Workers (depth of Postgres `jobs` table, processing rate, DLQ size)
  - DB & `pgvector` metrics (query latency, error rate)
- Tools: Supabase native monitoring, Grafana for advanced dashboards, Sentry for errors and performance traces.

Runbooks (select examples)
-   High job queue backlog:
    1.  Check `jobs` table depth and `job_failed_total` metrics.
    2.  Check Supabase Functions scaling configuration and resource utilization.
    3.  Check OpenRouter status; if degraded, pause "deep" jobs.
    4.  Inspect DLQ (`jobs` table with `status='failed'`) and reprocess safe items.
-   LLM provider outage:
    1.  LLM Adapter (Supabase Function) switches to backup models/providers via OpenRouter.
    2.  Pause non-critical heavy jobs, notify stakeholders, and post status update.
-   Spike in cost:
    1.  Check `llm_request_tokens_total` and Supabase Function invocation metrics.
    2.  Identify top consumers by aggregated token usage (from logging).
    3.  Apply temporary rate-limits or quota enforcement via Supabase Edge Functions.

Sampling & cost control
- When telemetry costs rise, apply:
    - Trace sampling (lower for successful requests; retain all errors).
    - Metrics aggregation and retention policies (Supabase native or integrated tools).

Testing & local development
- Utilize Supabase CLI (`supabase start`) for local observability stack (logs, metrics for local functions).
- Seed synthetic metrics and traces for local testing.
- Use mock backends for OTEL exporters for test validation.

Operational checklist
- Instrumentation completed for Supabase Edge Functions and Functions.
- Health endpoints exposed.
- Dashboards created.
- Alerts configured.
- Regular review of SLOs and error budgets.

References
- [`docs/archDecisions/infrastructure.md`](docs/archDecisions/infrastructure.md:1)
- [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- [`docs/archDecisions/security.md`](docs/archDecisions/security.md:1)
- [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25