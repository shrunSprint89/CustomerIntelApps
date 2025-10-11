# Backend architecture and decisions

Purpose
This document details backend/API decisions for the MVP: auth, endpoints, job orchestration, security, scaling, testing and monitoring. It complements [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1) and [`docs/archDecisions/mvp.md`](docs/archDecisions/mvp.md:1).

Summary
- Primary language: TypeScript (Node.js)
- Framework: NestJS (recommended) or Fastify for minimal footprint
- Deploy: Cloud Run / Fargate for backend service; Vercel API routes allowed for simple, short endpoints
- Auth: Supabase Auth (JWT) + server-side role checks
- Queue: Redis + BullMQ (managed) for background tasks
- Worker: containerized, stateless, idempotent worker(s)

Design principles
- Keep API surface small and versioned (/api/v1/)
- Treat LLM invocations and heavy research as asynchronous jobs
- Enforce evidence-first outputs: all claims include sources and retrieval scores
- Secure by design: verify tokens, sign webhooks, never expose provider keys

Authentication & sessions
- Use Supabase Auth for user identity and session management. Frontend uses Supabase client; backend validates Supabase JWT on each request.
- Admin/service endpoints use a service account key (stored in secret manager) for elevated operations.
- Token verification: fetch JWKS from Supabase or verify using Supabase SDK; reject expired/invalid tokens.

API surface (core endpoints)
- POST /api/v1/projects -> create project
- GET /api/v1/projects/:id -> get project
- POST /api/v1/projects/:id/generate -> start ICP generation (returns job id)
- GET /api/v1/reports/:id -> get report metadata and JSON output
- POST /api/v1/reports/:id/export -> queue PDF rendering
- GET /api/v1/reports/:id/download -> signed URL for PDF (short-lived)
- POST /api/v1/sources -> add user-provided source (private doc)
- POST /api/v1/webhooks/stripe -> stripe webhook (verify signature)
- POST /api/v1/webhooks/razorpay -> razorpay webhook (verify signature)
- GET /api/v1/admin/users -> admin-only user listing
- GET /api/v1/admin/usage -> admin metrics

Idempotency & reliability
- Generation endpoints accept Idempotency-Key header for safely re-trying requests.
- All create operations are transactional where necessary (create DB record then enqueue job).
- Worker jobs include job dedup keys and idempotency checks; use job.retry for transient failures.

Job lifecycle & schema
- icp_reports table: id, project_id, status (queued/running/failed/ready), prompt_inputs, output_json (nullable), pdf_url, created_at, updated_at
- jobs table: id, type, payload, status, attempts, last_error, created_at
- sources table: id, report_id, source_url, snippet, domain, retrieval_score, created_at

Background workers
- Responsibilities: fetch/scrape sources, chunk and embed text, upsert to Pinecone, retrieve top-k snippets, call LLM adapter, assemble structured ICP, persist output, trigger PDF rendering.
- Workers run as container instances on Cloud Run / Fargate with autoscaling; scale based on queue depth.
- Use exponential backoff and dead-letter queue for failing jobs.

LLM & provider adapter
- Backend does not call OpenAI directly from client. All provider calls are made server-side via an adapter service.
- Adapter responsibilities: abstract model provider, add retry/pacing, batching of embeddings, cost logging, usage quotas.

Data integrity & storage strategy
- Master data (projects, users, reports, billing) stored in Supabase Postgres.
- Embedding vectors stored in Pinecone; store minimal metadata in Postgres for cross-reference.
- Raw crawled content stored in object storage (Supabase Storage or S3) with reference id in Postgres.

Webhooks & external integration patterns
- Stripe/Razorpay webhooks verify signatures; on payment success update user plan and send notification.
- Offer webhook endpoint for async model/web-worker events if needed (e.g., long-running research that uses external scraper service).

Rate limiting and quotas
- API gateway enforces per-user rate limits (requests/minute) and per-plan quotas (generations/month).
- Protect heavy endpoints (/generate) with stricter limits and require payment_plan checks.
- Implement Redis-based distributed rate limiter.

Security considerations
- Secrets in secret manager (Cloud Secret Manager / AWS Secrets Manager); rotate keys periodically.
- HMAC verify webhooks and sign download URLs for PDFs.
- Input validation and sanitization for URLs and any user-submitted HTML or Markdown to prevent SSRF/XSS.
- Principle of least privilege for all service accounts.

Observability & monitoring
- Instrument HTTP handlers and worker jobs with OpenTelemetry traces.
- Push logs to centralized logging (Cloud Logging / Datadog).
- Errors reported to Sentry with context (user_id, project_id, job_id).
- Expose Prometheus metrics for queue depth, job durations, LLM error rate, and cost-per-job.

Testing & contract validation
- Unit tests for business logic, integration tests for DB and Pinecone (via test namespaces), end-to-end tests for core flows.
- Contract tests for the worker<->API interactions (job payload schemas).

CI/CD & deployments
- GitHub Actions pipeline: lint, tests, build, containerize, push to registry, and deploy to Cloud Run.
- Use environment-specific config (dev/staging/prod) with feature flags.

Error handling patterns
- API returns structured errors: {code, message, details} with semantic codes (e.g., GENERATION_TIMEOUT).
- Retry transient errors in worker; record failure reasons for admin review.

Data privacy & compliance
- Allow users to delete projects and associated data (GDPR right to be forgotten).
- Mask PII in logs and provide opt-out for training data reuse.

Alternative patterns & tradeoffs
- Next.js API routes (Vercel): fastest for MVP but limited for long-running jobs and background processes. Good for auth/proxy endpoints.
- Monolithic backend: simpler to manage at first but harder to scale and isolate billing/worker concerns.
- GraphQL vs REST: REST is simpler and matches the project needs; GraphQL could be added for flexible client queries later.

Operational runbook highlights
- Procedure to handle LLM provider outage: switch adapter to backup provider (OpenRouter/Anthropic), notify users and degrade non-essential features.
- Handling queue overload: enable circuit breaker and reject new "deep research" jobs with a friendly message and ETA.

Next steps
- Implement API skeleton (NestJS) with core endpoints and JWT verification.
- Create worker container image and simple job handler for a "hello world" generate job.
- Wire up Stripe and Razorpay test webhooks and verify flows in staging.

References
- [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- [`docs/archDecisions/mvp.md`](docs/archDecisions/mvp.md:1)
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)

Owner: Roo (architect)
Last updated: 2025-10-11