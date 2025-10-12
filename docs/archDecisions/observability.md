# Observability & Monitoring

Purpose
This document describes the observability strategy for the ICP generator platform: logging, metrics, distributed tracing, synthetic checks, alerts, dashboards, and runbooks required to operate Phase 1 (MVP) and scale into Phase 2.

Scope
- Structured logging, correlation, and retention
- Metrics collection, naming conventions, and scraping
- Distributed tracing and OpenTelemetry guidance
- Synthetic checks, uptime, and end-to-end smoke tests
- Alerting, SLOs and incident runbooks
- Dashboards, cost controls, and sampling strategy

Observability pillars
1. Logging
- Use structured JSON logs for all services (API, workers, ingestion, adapters).
- Core fields: timestamp, level, service, env, trace_id, span_id, request_id, user_id, project_id, job_id, message, error, meta.
- Example log (single-line JSON):
```json
{"timestamp":"2025-10-11T00:00:00Z","level":"info","service":"api","env":"prod","trace_id":"abcd1234","span_id":"ef01","request_id":"req-5678","user_id":"user-123","project_id":"proj-456","job_id":"job-789","msg":"ICP generation queued","meta":{"inputs":{"company":"example.com"}}}
```
- Recommendations:
  - Do not log secrets or raw PII; mask or redact before writing.
  - Centralize log ingestion to a managed provider (Grafana Cloud, Datadog, Cloud Logging, LogDNA).
  - Use a correlation id (request_id) generated at the edge and propagate through workers.

2. Metrics
- Use Prometheus-style metrics (instrument via prom-client or OpenTelemetry metrics).
- Key metrics and types:
  - icp_generation_duration_seconds (Histogram) — buckets for latency analysis
  - icp_generation_requests_total{status="success|failure",mode="fast|deep"} (Counter)
  - llm_request_count_total{model="gpt-4o"} (Counter)
  - llm_request_errors_total{model} (Counter)
  - llm_request_tokens_total (Counter) — token usage; label by model and user_plan
  - worker_queue_depth (Gauge)
  - pinecone_query_latency_seconds (Histogram)
  - embeddings_batch_size (Gauge)
- Labeling guidance:
  - Use low-cardinality labels on metrics (service, env, region, model, user_plan).
  - Avoid high-cardinality labels (user_id/project_id) on aggregated metrics; use them on logs or sampled traces only.
- Scrape model:
  - Expose /metrics endpoint on API and worker services for scraping.
  - For ephemeral containers (Workers on Cloud Run), push metrics to a Pushgateway or use a sidecar exporter.

3. Distributed Tracing
- Standardize on OpenTelemetry (OTEL) across Node/TS services and workers.
- Instrument critical spans:
  - HTTP request (ingress)
  - Database queries (Postgres)
  - Redis queue operations (enqueue/dequeue)
  - Embedding batch (embed_batch)
  - Pinecone upsert / query (pinecone_upsert / pinecone_query)
  - LLM call (llm_call) — include model, prompt size, token counts as attributes
  - PDF rendering (pdf_render)
- Propagation:
  - Use W3C Trace Context for trace propagation and include trace_id in logs.
- Sampling:
  - Capture all error traces.
  - Use adaptive sampling for high-throughput flows and keep a small percentage of successful traces.
- Backend: OTEL Collector -> Jaeger/Tempo or managed tracing backend (Grafana Cloud, Lightstep).

4. Synthetics & Health Checks
- Health endpoints:
  - /health (basic)
  - /health/liveness and /health/readiness for container platforms
- Synthetic checks:
  - Periodic end-to-end smoke tests that simulate a "fast" ICP generation (use test API keys and a sandbox mode).
  - Uptime checks from multiple regions to detect regional outages.
- Heartbeat monitoring for workers and queue consumers.

5. SLOs, Error Budgets & Alerts
- Example SLOs:
  - 99.9% availability for auth and project/project listing endpoints (monthly).
  - 95% of "fast" ICP requests complete under 30s.
- Alerting thresholds (examples):
  - Error rate > 1% over 5m -> P1 alert
  - Queue depth > (worker_capacity * 2) for 10m -> P1 alert
  - LLM provider error rate > 5% or sudden token cost spike -> P1
  - Long-running job (> configured threshold) -> P2
- Alert destinations:
  - PagerDuty / Opsgenie for on-call paging
  - Slack channel for ops notifications
  - Email for lower-severity notifications
- Escalation policy:
  - Define on-call rotations and tie alerts to runbooks (see Runbooks section).

Instrumentation guidance (implementation)
- Node.js / TypeScript:
  - Use @opentelemetry/sdk-node and instrumentations for http, express/fastify, pg, redis.
  - Create explicit spans around expensive operations (embedding batch, pinecone_query, llm_call).
  - Record attributes: model_name, mode (fast|deep), top_k, retrieval_count, token_usage.
  - Expose metrics via prom-client or OTEL metrics exporter.
- Next.js:
  - Instrument API routes and server-side rendering where applicable; measure SSR timings.
- Workers:
  - Emit job lifecycle metrics: job_enqueued_total, job_started_total, job_completed_total, job_failed_total.
  - Capture per-job duration histogram job_duration_seconds with labels job_type and mode.
- LLM/Embedding Adapter:
  - Instrument external calls with retries and record latency, error count, and token consumption; surface these as metrics and spans.

Correlation & metadata
- Generate request_id at edge (CDN or Next.js middleware) and attach it to all downstream requests and jobs.
- Use trace_id/span_id for deep correlation between logs and traces.
- Log structure should include trace_id and request_id to allow cross-linking:
  - Logs -> traces -> related metrics panels.
- Attach user_id/project_id to logs and traces when available; restrict metrics cardinality.

Logging: structure, retention & privacy
- Structured logs recommended format (JSON).
- Minimal retention defaults:
  - Prod logs: 90 days (raw). Optionally archive to cold storage afterwards.
  - Staging logs: 30 days.
- Traces retention:
  - Full tracing data: 30 days
  - Aggregated metrics: 180 days (daily rollups)
- Privacy:
  - PII masking before indexing logs.
  - Record consent metadata when processing user documents (see [`docs/archDecisions/security.md`](docs/archDecisions/security.md:1)).

Dashboard & visualization recommendations
- Dashboards to implement:
  - Platform Health (availability, error rate, avg latency)
  - ICP pipeline (requests by mode, median/95th latency, success rate)
  - LLM provider (requests, errors, tokens, estimated cost)
  - Queue & Workers (depth, processing rate, DLQ size)
  - DB & Pinecone metrics (query latency, error rate)
- Tools:
  - Grafana for dashboards
  - Use Grafana Alerting or external alert manager (PagerDuty integration)
  - Leverage Sentry for errors and performance traces

Example Prometheus metric names (prom best-practices)
- icp_generation_duration_seconds (Histogram) — labels: service, env, mode
- icp_generation_requests_total{status="success|failure"} (Counter)
- llm_request_count_total{model="…",service="…"} (Counter)
- llm_request_errors_total{model} (Counter)
- llm_request_tokens_total (Counter)
- worker_job_queue_depth (Gauge)
- pinecone_query_latency_seconds (Histogram)
- pg_query_duration_seconds (Histogram)

Runbooks (select examples)
- High queue backlog:
  1. Check `worker_queue_depth` and `job_failed_total`.
  2. Scale workers (increase instances or concurrency).
  3. Check LLM provider status; if provider degraded, pause "deep" jobs and notify users.
  4. Inspect DLQ and reprocess safe items after remediation.
- LLM provider outage:
  1. Trigger adapter failover to backup provider (if configured).
  2. Pause non-critical heavy jobs, notify stakeholders, and post status update for users.
  3. Requeue or reschedule jobs after provider restored or fallback confirmed.
- Spike in cost:
  1. Check `llm_request_tokens_total` and `icp_generation_requests_total`.
  2. Identify top consumers by aggregated token usage.
  3. Apply temporary rate-limits or quota enforcement; notify finance and product.

Sampling & cost control
- When telemetry costs rise, apply:
  - Trace sampling (lower for successful requests; retain all errors).
  - Metrics aggregation and retention policies (downsample to daily rollups after 30 days).
  - Adaptive tracing for expensive spans (record full spans for 1% of requests and all errors).

Testing & local development
- Provide local OTEL Collector and Prometheus stack via docker-compose for dev.
- Offer scripts to seed synthetic metrics and replay sample traces.
- Use mock backends for OTEL exporters and pushgateway in CI for test validation.

Operational checklist
- Instrumentation completed for API and workers
- /metrics and /health endpoints exposed and secured
- Grafana dashboards created and linked to runbooks
- Alerts configured and tested via PagerDuty or equivalent
- Regular review of SLOs and error budgets

References
- [`docs/archDecisions/infrastructure.md`](docs/archDecisions/infrastructure.md:1)
- [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)
- [`docs/archDecisions/security.md`](docs/archDecisions/security.md:1)

Owner: Roo (architect)
Last updated: 2025-10-11