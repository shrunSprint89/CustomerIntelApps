# Phase 1 Dev Checklist — Model-only ICP Generator (30-day)

Purpose
Provide clear developer tasks to deliver Phase 1: model-only ICP JSON generation within 30 days. This checklist maps to the architecture and roadmap: [`docs/archDecisions/roadmap.md`](docs/archDecisions/roadmap.md:1).

Success criteria
- Users can sign up, create a project, submit seed input and receive structured ICP JSON stored in DB.
- Generated JSON conforms to schema and includes a confidence field per claim.
- Unit & E2E tests for core flows pass in CI.
- Basic token accounting and per-user quotas in place.

Minimal deliverables (MUST)
1) Auth & Projects
- Integrate auth using Supabase (or mock in dev) and implement Project CRUD endpoints: [`/api/v1/projects`](api/:1).

2) Generate API endpoint
- POST `/api/v1/projects/:id/generate` accepts seed inputs and enqueues job. See [`docs/archDecisions/backend.md`](docs/archDecisions/backend.md:1).

3) Worker skeleton
- Implement worker to pull jobs from Redis/BullMQ, call LLM adapter, persist results to `icp_reports` table.

4) LLM Adapter (model-only)
- Implement [`src/services/llm-adapter.ts`](src/services/llm-adapter.ts:1) (adapter pattern) that calls OpenAI / OpenRouter and returns JSON.
- Store prompt templates under [`ml/prompts/icp_v1.json`](ml/prompts/icp_v1.json:1).

5) Persistence
- Ensure `icp_reports` has fields: id, project_id, status, output_json, token_usage. Reference: [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:1).

6) Frontend minimal UI
- Provide a simple form to submit seed inputs and a viewer to display `output_json`. Place under [`/web`](web/:1).

7) Testing & CI
- Add unit tests for adapter, worker, and API; E2E smoke test: signup -> generate -> retrieve.
- CI workflow skeleton: [`.github/workflows/ci.yml`](.github/workflows/ci.yml:1).

Implementation tasks (prioritized)

MUST (week 1)
- [ ] Setup environment and secrets (OpenAI test keys, Supabase dev project, Redis).
- [ ] Implement Project model and Auth integration (`/api`).
- [ ] Implement POST /generate endpoint (enqueue job).
- [ ] Create worker scaffold that logs received jobs.

SHOULD (week 2)
- [ ] Implement LLM adapter and prompt template (`ml/prompts/icp_v1.json`).
- [ ] Implement basic JSON schema validation and error handling.
- [ ] Persist `icp_reports.output_json` and `icp_reports.token_usage`.
- [ ] Implement front-end seed form and JSON viewer (`/web`).

NICE TO HAVE (week 3)
- [ ] Add token accounting and per-user quotas enforcement.
- [ ] Add basic admin metrics page for total reports and token spend.
- [ ] Add Playwright E2E tests and integrate into CI.

OPTIONAL (deferred)
- [ ] PDF export (Phase 2 if needed).
- [ ] RAG pipeline (Phase 2).

Dev notes: Prompt engineering
- Use strict system instruction: output only valid JSON matching schema.
- Add few-shot examples in the prompt for better structure.
- Include "confidence" attribute per claim; instruct model to mark "low" if uncertain.
- Keep prompts concise to reduce token cost; test multiple variants.

Observability & safety
- Log job lifecycle events with request_id and trace_id; capture token usage in logs.
- Implement rate limits and quotas to prevent runaway costs.
- Do not send sensitive PII to LLM unless explicit consent; mask before sending.

Local dev & mock mode
- Provide mock LLM responses for offline dev (`src/mocks/llm-mock.ts`:1).
- Provide `docker-compose.yml` for local Postgres + Redis.

Timeline mapping (30 days)
Week 1: Env, auth, projects, enqueue, worker scaffold (MUST).
Week 2: LLM adapter, prompt tuning, JSON validation, persist outputs (SHOULD).
Week 3: Frontend UX, token accounting, quotas, tests (NICE).
Week 4: E2E hardening, prompt tuning, SLAs, prepare beta release.

Acceptance checklist (to close Phase 1)
- [ ] 10 representative sample inputs produce schema-valid JSON in CI.
- [ ] Token usage recorded per report.
- [ ] Senior Engineer reviewed outputs and approved model prompts.
- [ ] CI passes E2E smoke tests.

Next steps after Phase 1
- Implement RAG pipeline (ingestion, embeddings, vector store) as in [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1).
- Add provenance UI and PDF exports.

Owner: Roo (architect/coder)  
Last updated: 2025-10-12