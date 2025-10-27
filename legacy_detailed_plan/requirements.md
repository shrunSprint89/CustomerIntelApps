# Requirements: Elsa-like AI Marketing Assistant (Architectural Decisions - Simplified for MVP Phase 1)

Purpose
The purpose of this document is to capture high-level functional and non-functional requirements for building a replica and improved product inspired by https://www.m1-project.com/ (Elsa AI), guiding stack decisions and the MVP scope within a simplified, Supabase-first architecture.

Sources
- Website content: m1-project marketing pages and features
- Example ICP PDF: [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)

Goals
- Deliver an ICP generator that produces evidence-backed, exportable reports (PDF/HTML) with provenance links and citations.
- Reduce time and manual research for marketers and consultants while avoiding hallucinations.
- Provide a minimal workspace, billing, and admin features for Phase 1; expand to strategy and content tools in Phase 2.

MVP phases
- **Phase 1 (MVP):** Focused on the ICP generator and core platform primitives to serve ~1k MAU with low ops costs. Deliverables include user auth (leveraging SaaS starter), project/workspace, RAG-backed ICP generation (Supabase Functions + `pgvector` + OpenRouter), editable ICP template (formatting-only), PDF/JSON export (Supabase Functions), payments (one-off + subscription initial, handling USD/INR, currency conversion options), storage for reports, and a minimal admin dashboard.
- **Phase 2 (Post-MVP):** Add Strategy Builder, Content & Ads Generator, Templates & Library, cohorts/community features, team accounts, advanced integrations, and scale MAUs beyond Phase 1 targets.

Scope and Assumptions
- Phase 1 MVP targets: ICP generator, editable ICP template, user accounts, PDF export, payments (one-off + subscription minimal), and admin dashboard.
- Phase 2: Strategy builder, content/ad generation, templates library, cohort features, and team workspace capabilities.
- Target first-phase release scale: ~1k MAU; cost-sensitive and low-ops by maximizing Supabase.
- Primary market: global English-speaking marketers with early focus on Indian/EM payment integrations.

Stakeholders
- Founders / product owners
- Marketing teams and agencies
- Independent consultants and freelance marketers
- End users (founders, growth marketers)
- Platform admins and support staff

Functional requirements (MUST)
1.  **User authentication and account management:**
    -   Email/password sign-up, email verification, password reset (SaaS starter UI, Supabase Auth backend).
    -   Social SSO (Google, LinkedIn) optional for Phase 1.
    -   Role-based access control: user, admin, support (managed via Supabase RLS and application logic).
2.  **Workspace & Projects:**
    -   Users create projects/workspaces to manage ICPs and generated reports.
    -   Project-level settings, history, and export (all managed via Supabase Postgres).
3.  **ICP Generator (core):**
    -   Accept structured input (company name, URL, seed personas, market).
    -   Automated RAG pipeline:
        -   Collects evidence from configurable sources (web scraping, user uploads) via Supabase Functions.
        -   Indexes into Supabase Postgres with `pgvector` (for vector index).
        -   OpenRouter (via LLM Adapter in Supabase Function) grounds LLM outputs on retrieved evidence.
    -   Structured ICP output: Segment, Persona, Jobs-to-be-done, Goals, Problems, Channels, Sources, Triggers, Barriers.
    -   Export to PDF and JSON with embedded provenance links and "sources" section (Supabase Functions).
4.  **Editable ICP template (ICF/format):**
    -   Provide an editable, template-driven ICP structure that controls output formatting. Admins (and later users) can modify the template layout; changes affect PDF/HTML exports but not the underlying data schema.
5.  **Export & Reporting:**
    -   Generate downloadable PDF reports that match the ICP example structure (Supabase Functions).
    -   Shareable links with access control (Supabase Storage signed URLs).
6.  **Payments & Billing:**
    -   Support one-off purchases and basic subscriptions (via SaaS starter UI, Stripe/Razorpay integration).
    -   Integrate local payment methods for India (Razorpay/UPI) and global providers (Stripe).
    -   Support payments in USD with potential for currency conversion options (managed in frontend/mid-tier logic).
    -   Generate invoices and receipts (basic).
7.  **Admin Dashboard:**
    -   User and billing management, model usage monitoring, content moderation, and support tools (built into Next.js frontend, interacting with Supabase Edge Functions/Postgres).
8.  **Evidence Traceability & Anti-Hallucination Controls (core non-negotiable):**
    -   For every LLM-based claim, attach source snippets and URLs used to produce it (stored in `provenance_mappings`).
    -   Human-editable evidence panel in UI so users can verify or remove sources.
9.  **Data export and import:**
    -   Export ICPs as JSON/CSV/PDF; import user-provided datasets (CSV).
10. **Audit, logging and usage quotas:**
    -   Track generation events, limits, and billing-relevant metrics (leveraging Supabase logging and metrics).

Functional requirements (Phase 2 / SHOULD)
- Strategy Builder (Phase 2): Use ICP to generate acquisition strategy, positioning, value proposition, tone of voice, and recommended channels; allow user adjustments and regeneration.
- Content & Ads Generator (Phase 2): Generate short-form content, long-form outlines, captions, ad text, and creative briefs optimized by channel; include variations and A/B test suggestions.
- Templates & Library (Phase 2): Prebuilt templates for email sequences, ad campaigns, landing pages, pitch decks (marketplace later).
- Live cohort features: scheduling, cohort chat (Telegram/WhatsApp integration options), progress tracking.
- Integrations: Notion, Loom, Typeform, Tally templates, Zapier.
- Team accounts and shared workspaces with role permissions.
- Fine-grained content versioning and A/B test tracking.

Non-Functional requirements
- **Performance:**
  - UI interactions: < 200ms for common UI actions.
  - ICP generation: target 5–30s median for typical "fast" prompts; support background "deep" runs using Supabase Functions that may take longer.
- **Scalability:**
  - Support horizontal scaling for Supabase Edge Functions and Functions.
  - `pgvector` in Supabase Postgres must scale efficiently for initial millions of documents.
- **Availability & Reliability:**
  - Target SLA: 99.9% for core user flows (auth, project access, export).
  - Graceful degradation for heavy ML jobs (enqueue, notify when ready).
- **Security and Privacy:**
  - TLS everywhere, encryption at rest for user data, secrets in Supabase Secrets.
  - Per-tenant data isolation for team workspaces (via Supabase RLS).
  - Store PII minimal and allow data deletion (GDPR right to be forgotten).
- **Maintainability:**
  - Modular Supabase Functions/Edge Functions with clear contracts and tests.
- **Cost:**
  - Keep first-phase cloud costs predictable; prefer managed serverless (Supabase) to reduce ops overhead.

Data and ML-specific requirements
- Provenance store: every generated section must link to retrieved sources (URL + snippet + retrieval score).
- Vector store: `pgvector` in Supabase Postgres for embeddings storage.
- Dataset management: ingest pipelines (Supabase Functions), deduplication, metadata, update cadence.
- Model orchestration: OpenRouter via an adapter (Supabase Function) for swapping LLM providers.
- Retrain / fine-tune workflows: store training datasets, evaluation metrics, and model versions (Phase 2 consideration).
- CI for ML: automated validation tests and hallucination detection checks on new LLM prompt builds.

Compliance, Legal, and Privacy
- Support data processing agreements and consent capture for user-provided data used in model training.
- Opt-out for reuse of user data in model training by default.

Observability and Operations
- Centralized logging (Supabase logs), metrics (Supabase native, custom from functions), traces (OpenTelemetry for Supabase Functions/Edge Functions) for comprehensive monitoring.
- Business-level KPIs: Phase 1 MAU, conversion rate from trial to paid, average time-to-generate ICP, cost-per-generation.
- Alerting for LLM failures, job queue backlogs (Postgres), payment failures, and SLA breaches (Supabase monitoring and Sentry).
- **Analytics:** Integration with Google Analytics through frontend, and potentially a tag manager (e.g., Google Tag Manager) and Metapixel for marketing attribution.
- **Emails:** Transactional and marketing emails with clear provider integration and opt-out mechanisms.
- **Affiliate Marketing:** Platform for tracking and managing affiliate programs.

Acceptance criteria (Phase 1 MVP)
- A user can sign up and create a project.
- The platform generates a structured ICP for a provided company or seed inputs and exports a PDF matching the example layout and including source links.
- Payments are processed (one-off or subscription) for USD/INR and user access is gated accordingly.
- Admin can view usage metrics and perform basic user and billing operations.

Constraints and open questions
- Expected MAU and peak concurrency targets for Phase 2.
- Initial budget for cloud and model inference (primarily OpenRouter usage).

Recommended Phase 1 technical approach (summary)
- **Frontend:** React + Next.js (Vercel) with a SaaS starter template for fast iteration, SEO, and pre-built features.
- **Backend/API:** Fully Supabase-centric with Edge Functions for API endpoints/webhooks and Functions for all background workers.
- **Auth & User mgmt:** Supabase Auth.
- **Primary DB & Vector DB:** Supabase PostgreSQL with `pgvector` for all data.
- **Embeddings + LLMs:** OpenRouter via an adapter (Supabase Function).
- **Background jobs:** Postgres-based queue managed by Supabase Functions.
- **Storage:** Supabase Storage.
- **PDF Generation:** Headless browser (Puppeteer) or server-side library within a Supabase Function.
- **Integrations:** Adapter pattern for payments (Stripe/Razorpay) and other services (emails, analytics).

Key design decisions validated
1.  **Managed LLM provider (OpenRouter):** Chosen for flexibility, cost control, and rapid iteration.
2.  **Vector DB choice (`pgvector`):** Selected for cost-efficiency and deep integration within Supabase for MVP.
3.  **Payments provider(s) and INR/USD pricing handling:** Stripe and Razorpay, with an adapter for payments.
4.  **SaaS Starter:** Chosen to accelerate frontend development and integrate common SaaS features.

Next steps
- All architecture documents (`frontend.md`, `backend.md`, `data-storage.md`, `ml-pipeline.md`, `integrations.md`, `infrastructure.md`, `security.md`, `observability.md`, `cost.md`, `mvp.md`, `phase1-checklist.md`, `roadmap.md`, `vector-store-choice.md`, `ICP-insights.md`) should now reflect this consolidated approach.

References
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1) (sample ICP)
- https://www.m1-project.com/

Document owner: Roo (architect)
Last updated: 2025-10-25
