# Requirements: Elsa-like AI Marketing Assistant (architectural decisions)

Purpose
The purpose of this document is to capture high-level functional and non-functional requirements for building a replica and improved product inspired by https://www.m1-project.com/ (Elsa AI). It will be used to guide stack decisions and the MVP scope.

Sources
- Website content: m1-project marketing pages and features
- Example ICP PDF: [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)

Goals
- Deliver an ICP generator that produces evidence-backed, exportable reports (PDF/HTML) with provenance links and citations.
- Reduce time and manual research for marketers and consultants while avoiding hallucinations.
- Provide a minimal workspace, billing, and admin features for Phase 1; expand to strategy and content tools in Phase 2.

MVP phases (new)
- Phase 1 (MVP): Focused on the ICP generator and core platform primitives to serve ~1k MAU with low ops costs. Deliverables include user auth, project/workspace, RAG-backed ICP generation, editable ICP template (formatting-only), PDF/JSON export, payments (one-off + subscription minimal), storage for reports, and an admin dashboard.
- Phase 2 (Post-MVP): Add Strategy Builder, Content & Ads Generator, Templates & Library, cohorts/community features, team accounts, advanced integrations, and scale MAUs beyond Phase 1 targets.

Scope and Assumptions
- Phase 1 MVP targets: ICP generator, editable ICP template, user accounts, PDF export, payments (one-off + subscription minimal), and admin dashboard.
- Phase 2: Strategy builder, content/ad generation, templates library, cohort features, and team workspace capabilities.
- Target first-phase release scale: ~1k MAU; cost-sensitive and low-ops.
- Primary market: global English-speaking marketers with early focus on Indian/EM payment integrations.

Stakeholders
- Founders / product owners
- Marketing teams and agencies
- Independent consultants and freelance marketers
- End users (founders, growth marketers)
- Platform admins and support staff

Functional requirements (MUST)
1. User authentication and account management
   - Email/password sign-up, email verification, password reset
   - Social SSO (Google, LinkedIn) optional for Phase 1
   - Role-based access control: user, admin, support
2. Workspace & Projects
   - Users create projects/workspaces to manage ICPs and generated reports
   - Project-level settings, history, and export
3. ICP Generator (core)
   - Accept structured input (company name, URL, seed personas, market)
   - Automated research pipeline that collects evidence from configurable sources (news, blogs, industry reports, public datasets)
   - RAG (retrieval-augmented generation) pipeline that uses a vector index to ground LLM outputs on retrieved evidence
   - Structured ICP output: Segment, Persona, Jobs-to-be-done, Goals, Problems, Channels, Sources, Triggers, Barriers
   - Export to PDF and JSON with embedded provenance links and "sources" section
4. Editable ICP template (ICF/format)
   - Provide an editable, template-driven ICP structure stored as a document/template that controls output formatting (headings order, visible sections, styling). Admins (and later users) can modify the template layout; changes affect PDF/HTML exports but not the underlying data schema.
5. Export & Reporting
   - Generate downloadable PDF reports that match the ICP example structure (including sources)
   - Shareable links with access control
6. Payments & Billing
   - Support one-off purchases and basic subscriptions
   - Integrate local payment methods for India (Razorpay/UPI) and global providers (Stripe)
   - Generate invoices and receipts (basic)
7. Admin Dashboard
   - User and billing management, model usage monitoring, content moderation, and support tools
8. Evidence Traceability & Anti-Hallucination Controls (core non-negotiable)
   - For every LLM-based claim, attach source snippets and URLs used to produce it
   - Human-editable evidence panel in UI so users can verify or remove sources
9. Data export and import
   - Export ICPs as JSON/CSV/PDF; import user-provided datasets (CSV)
10. Audit, logging and usage quotas
   - Track generation events, limits, and billing-relevant metrics

Functional requirements (Phase 2 / SHOULD)
- Strategy Builder (Phase 2): Use ICP to generate acquisition strategy, positioning, value proposition, tone of voice, and recommended channels; allow user adjustments and regeneration.
- Content & Ads Generator (Phase 2): Generate short-form content, long-form outlines, captions, ad text, and creative briefs optimized by channel; include variations and A/B test suggestions.
- Templates & Library (Phase 2): Prebuilt templates for email sequences, ad campaigns, landing pages, pitch decks (marketplace later).
- Live cohort features: scheduling, cohort chat (Telegram/WhatsApp integration options), progress tracking
- Integrations: Notion, Loom, Typeform, Tally templates, Zapier
- Team accounts and shared workspaces with role permissions
- Fine-grained content versioning and A/B test tracking

Non-Functional requirements
- Performance
  - UI interactions: < 200ms for common UI actions
  - ICP generation: target 5–30s median for typical "fast" prompts; support background "deep" runs that may take longer
- Scalability
  - Support horizontal scaling for API and ML inference layers
  - Vector index must scale to millions of documents (vector shards or managed service) for Phase 2
- Availability & Reliability
  - Target SLA: 99.9% for core user flows (auth, project access, export)
  - Graceful degradation for heavy ML jobs (enqueue, notify when ready)
- Security and Privacy
  - TLS everywhere, encryption at rest for user data, secrets in managed vault
  - Per-tenant data isolation for team workspaces (Phase 2 features)
  - Store PII minimal and allow data deletion (GDPR right to be forgotten)
- Maintainability
  - Modular services (API, worker, ML pipeline) with clear contracts and tests
- Cost
  - Keep first-phase cloud costs predictable; prefer managed serverless or PaaS where it reduces ops overhead

Data and ML-specific requirements
- Provenance store: every generated section must link to retrieved sources (URL + snippet + retrieval score)
- Vector store: support embeddings storage (pgvector or managed vector DB)
- Dataset management: ingest pipelines, deduplication, metadata, update cadence
- Model orchestration: easy to swap LLM providers (OpenAI, Anthropic, OpenRouter), support hybrid chaining
- Retrain / fine-tune workflows: store training datasets, evaluation metrics, and model versions (Phase 2 consideration)
- CI for ML: automated validation tests and hallucination detection checks on new model builds

Compliance, Legal, and Privacy
- Support data processing agreements and consent capture for user-provided data used in model training
- Opt-out for reuse of user data in training by default
- Data residency options (if required by customers) as an enterprise feature

Observability and Operations
- Centralized logging (structured logs), metrics (Prometheus), traces (OpenTelemetry)
- Business-level KPIs: Phase 1 MAU, conversion rate from trial to paid, average time-to-generate ICP, cost-per-generation
- Alerting for model failures, job queue backlogs, payment failures, and SLA breaches

Acceptance criteria (Phase 1 MVP)
- A user can sign up and create a project
- The platform generates a structured ICP for a provided company or seed inputs and exports a PDF matching the example layout and including source links
- Payments are processed (one-off or subscription) and user access is gated accordingly
- Admin can view usage metrics and perform basic user and billing operations

Constraints and open questions
- Expected MAU and peak concurrency targets for Phase 2
- Initial budget for cloud and model inference (OpenAI usage vs. self-hosted LLMs)
- Preferred cloud provider(s) or restrictions (AWS, GCP, Azure, or hybrid)
- Compliance constraints (GDPR, India-specific data residency)

Recommended Phase 1 technical approach (summary)
- Frontend: React + Next.js (Vercel) for fast iteration and SEO; mobile-responsive UI
- Backend/API: Node.js + TypeScript (Fastify or NestJS) with REST/GraphQL API (use serverless endpoints for short operations)
- Auth & User mgmt: Supabase Auth for Phase 1 (fast MVP) or Clerk/Auth0 as optional replacement
- Primary DB: PostgreSQL (hosted: Supabase/Azure/Managed RDS) for relational data
- Vector DB: Pinecone (managed) for Phase 1 or pgvector in Supabase as a low-cost fallback
- Embeddings + LLMs: Use OpenAI (or other providers via OpenRouter) for initial Phase 1; abstract provider via an adapter
- Background jobs: BullMQ / Redis queues for worker orchestration
- Storage & CDN: S3-compatible (AWS S3 or Wasabi) + CDN for assets
- Host ML orchestration on serverless containers (Cloud Run / AWS Fargate) or managed services
- PDF Generation: headless browser (Puppeteer) or server-side PDF library with templating

Key design decisions to validate early
1. Use a managed LLM provider vs. self-hosting (tradeoff: latency/cost vs control)
2. Vector DB choice: pgvector vs managed Pinecone/Weaviate
3. Payments provider(s) and INR pricing handling
4. Whether to provide multi-tenant data residency in initial release

Next steps
- Produce stack-by-stack analysis documents in docs/archDecisions/ (frontend.md, backend.md, data-storage.md, ml-pipeline.md, integrations.md, infrastructure.md, security.md, observability.md, cost.md)
- Create component diagrams and data-flow (Mermaid) in docs/archDecisions/architecture.md
- Align with you on Phase 2 targets, cloud budget, and preferred providers

References
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1) (sample ICP)
- https://www.m1-project.com/

Document owner: Roo (architect)
Last updated: 2025-10-11
