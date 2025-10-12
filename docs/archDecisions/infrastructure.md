# Infrastructure, hosting & CI/CD

Purpose
This document describes the recommended infrastructure, hosting choices, CI/CD pipelines, Infrastructure-as-Code (IaC) approach, secrets management, backups, and disaster recovery for the Phase 1 MVP and Phase 2 scale of the ICP generator product.

Scope
- Hosting and runtime for frontend, API, workers, and data stores
- CI/CD (GitHub Actions) and deployment workflows
- Infrastructure-as-Code (Terraform) guidance and remote state
- Secrets management, configuration, and environment segregation
- Backups, snapshots, monitoring integration touchpoints and DR runbooks
- Cost-aware choices for Phase 1 (low ops) and Phase 2 (scalable)

Assumptions
- Phase 1 target: ~1k MAU, peak concurrency ~50; keep ops minimal and use managed services
- Preferred stack (Phase 1): Vercel (frontend), Supabase (Auth + Postgres + Storage), Pinecone (vector DB), OpenAI (LLM), Cloud Run (workers) or AWS Fargate
- CI: GitHub Actions
- Use single-cloud for managed services where possible but allow provider-agnostic IaC

High-level topology
- Frontend: Next.js deployed to Vercel (CDN + edge). Marketing pages SSR via Vercel.
- API: Serverless API routes on Vercel for short/fast endpoints; Cloud Run / Fargate container for long-running or stateful backend endpoints.
- Workers: Containerized workers (Cloud Run or Fargate) process ingestion, embedding, LLM invocation, and PDF rendering.
- Database: Supabase Postgres (managed) for relational data; backups enabled with PITR when available.
- Vector store: Pinecone (managed) for embeddings and retrieval.
- Job queue: Managed Redis (RedisCloud/Upstash/ElastiCache) for BullMQ.
- Storage: Supabase Storage (S3-compatible) or AWS S3 for raw crawled pages, uploaded docs, and PDFs.
- Secrets: Cloud Secret Manager (GCP Secret Manager / AWS Secrets Manager) or Vercel/Supabase secrets for env vars.
- Observability: Sentry (errors), OpenTelemetry traces (workers + API), Prometheus/Grafana (metrics), centralized logs.

Environments & isolation
- Environments: dev, staging, prod. Use separate Supabase projects and Pinecone namespaces for staging vs prod.
- Remote state: Terraform remote state backend (GCS or S3) per environment; enable state locking (DynamoDB or Terraform Cloud).
- Feature flags: LaunchDarkly or Unleash for controlled rollouts.
- Access control: least-privilege IAM roles per environment and service account separation.

CI/CD design (GitHub Actions)
- Repo layout: monorepo with packages: /web (Next.js), /api (Node service), /workers (containerized workers), /infra (Terraform)
- Workflows:
  - pull_request: lint, typecheck, unit tests, build preview artifacts for Next.js; Vercel preview deployments on PR
  - merge to main: run full test suite, build artifacts, terraform plan for infra changes, then deploy (Vercel for frontend; build & push API & worker images; deploy to Cloud Run)
  - infra workflow: terraform fmt/validate/plan on PR; terraform apply gated behind approval
- Secrets in Actions: use GitHub Secrets (or a vault) and restrict who can modify them
- Artifact retention: retain build artifacts/logs for 30 days to aid debugging

Terraform & IaC
- Directory: /infra with modularized modules: network, iam, postgres, redis, object-storage, registry, monitoring
- Remote state: Terraform Cloud or S3 + DynamoDB locking; encrypt remote state at rest
- Provider-agnostic modules: parameterize cloud specifics so modules can be swapped across cloud providers
- IAM and service accounts: define least-privilege roles; use separate service accounts for workers, API, and CI
- Migrations: include DB migration orchestration in infra pipeline (run migrations as part of deploy step)

Container builds & registries
- Registry: GitHub Container Registry or cloud-native registry (GCR/ECR)
- Build: multi-stage Dockerfiles with caching; tag images by commit SHA and branch
- Health checks: readiness & liveness probes configured; autoscaling rules with sensible min/max
- Concurrency & resource limits: set CPU/memory limits and concurrency settings for Cloud Run to control cost

Secrets & configuration management
- Secret storage: use cloud secret manager; inject secrets at deploy time
- Local development: `.env.example` tracked in repo; real secrets kept out of source control
- Encryption: use KMS-backed encryption for secrets and sensitive configs
- Token policies: refresh tokens periodically; store refresh tokens encrypted; revoke on disconnect

Backups & Disaster Recovery
Postgres
- Enable automated daily backups and point-in-time recovery where available; retention >= 30 days for Phase 1
- Quarterly restore drills to a staging environment to verify backup integrity
Vector store
- Pinecone: schedule index exports/snapshots to object storage if supported
- If using pgvector: include vector export scripts as periodic jobs
Object storage
- Enable versioning and lifecycle rules; optionally use cross-region replication for higher availability
Disaster recovery playbook
- Document RTO/RPO objectives for each subsystem
- Steps to restore DB snapshot, re-import vectors, re-index if necessary, and re-deploy services
- Define communication plan and escalation paths

Scaling & cost controls
- Phase 1: use serverless/managed services with low fixed cost (Supabase hobby/pro, Vercel Hobby/Pro, Pinecone Starter)
- Autoscaling: scale workers by queue depth; configure min instances if low-latency is required
- Throttling: implement application-level throttles on LLM/embedding calls and per-user quotas
- Caching & reuse: cache embeddings and retrieval results; batch embedding requests
- Cost monitoring: enable billing alerts and set monthly spend thresholds

High availability & resilience patterns
- Circuit-breakers for LLM provider failures; fallback to cached results or secondary provider
- Dead-letter queue for failed jobs and operator-driven replays
- Graceful degradation: serve cached "fast" ICP when deep research pipelines are unavailable
- Health checks and automated restarts for services

Observability & logging touchpoints
- Tracing: instrument API and workers with OpenTelemetry for distributed traces
- Error tracking: Sentry with contextual tags (user_id, project_id, job_id)
- Metrics: export metrics to Prometheus/Grafana Cloud or DataDog; monitor request latencies, queue depth, LLM error rates, cost-per-generation
- Logging: centralized logs with structured JSON and correlation IDs

Security & compliance alignment
- VPC: place databases and Redis in private subnets where possible; use VPC connectors for Cloud Run
- Network controls: security groups and network ACLs, least-privilege
- TLS: enforce TLS for all public endpoints and internal service-to-service connections
- WAF: consider adding a WAF in front of public APIs for protection against common attacks
- Audit logging: capture admin/billing actions for compliance

Deployment & release practices
- Canary and blue/green deployments supported in Phase 2 via weighted traffic and feature flags
- PR previews for frontend via Vercel and ephemeral environments for API when feasible
- Migrations: ensure backward-compatible schema changes; run migration jobs and perform smoke tests before cutover

Local development experience
- Local dev: `docker-compose` for Postgres, Redis, and local worker; mock Pinecone and LLM adapters for offline dev
- Seed data: include sample ICP reports (from [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)) for development and testing
- Mocking: provide mock LLM responses and connector simulators for reliable tests

Cost estimation & budgeting guidance (Phase 1)
- Vercel: $0–$40 (Hobby/Pro)
- Supabase: $25–$100 for modest usage
- Pinecone: $50–$200 starter tier
- OpenAI: variable; optimize prompts and caching — expect $200–$700/mo depending on usage
- Cloud Run/worker + Redis: $10–$100
- Storage & bandwidth: $10–$50
- Total (conservative): aim under $1,000/mo by optimizing LLM usage and batching embeddings

Runbooks & incident handling
- LLM outage: switch adapter to backup provider, notify users of degraded mode, freeze deep-research jobs
- DB incident: restore from latest snapshot to staging, run smoke tests, then promote after verification
- Payment webhook failures: replay events from `webhook_event` table via admin UI
- Queue overload: increase worker concurrency cautiously and surface ETA to users

Acceptance criteria
- Services deploy automatically via CI on merge to main
- Preview deployments available for every PR
- Terraform plans validated in PRs; `apply` gated behind approvals
- Backups configured and a Postgres restore tested
- Secrets managed via secret manager; no secrets in repo

Next steps
- Finalize Terraform module templates and commit to `/infra`
- Implement GitHub Actions workflows (lint/test/build/deploy)
- Provide local dev `docker-compose` and seed data
- Create remaining docs: [`docs/archDecisions/security.md`](docs/archDecisions/security.md:1), [`docs/archDecisions/observability.md`](docs/archDecisions/observability.md:1), [`docs/archDecisions/cost.md`](docs/archDecisions/cost.md:1), and [`docs/archDecisions/roadmap.md`](docs/archDecisions/roadmap.md:1)

References
- [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)