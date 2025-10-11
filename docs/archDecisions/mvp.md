# MVP: Scope & Prioritization

Overview
This document defines the minimal viable product (MVP) scope, prioritized features, acceptance criteria, and a short roadmap for the Elsa-like AI marketing assistant inspired by https://www.m1-project.com/ and the provided ICP PDF: [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1).

Goals
- Deliver a working ICP generator that produces evidence-backed reports with provenance and PDF export.
- Provide core content and ad generation tied to ICP outputs.
- Gate premium features behind payments and deliver a smooth onboarding flow.
- Keep ops low and costs under $1,000/month for initial scale (1k–5k MAU).

Sources & assumptions
- Primary product reference: https://www.m1-project.com/
- Example ICP and requirements derived from: [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)
- Architecture requirements brief: [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- Preferred stack choices (user): Vercel + Supabase/AWS, managed LLMs (OpenAI / OpenRouter), Pinecone for vector DB.

MVP Principles
1. Evidence-first: Every claim must link to source snippets and URLs (provenance).
2. Fast-to-market: Favor managed services that reduce ops (Vercel, Supabase, Pinecone).
3. Cost-aware: Optimize LLM usage and batch expensive calls.
4. Extensible: Build adapter layers for swapping LLM and vector providers.

Must-have features (MVP)
1) User onboarding & authentication
- Email sign-up, verification, password reset
- Basic project/workspace creation
- Simple billing link to Stripe + Razorpay (INR support)

2) ICP Generator (core)
- Accept seed inputs: company name, URL, industry, short description
- Retrieval pipeline (RAG) that fetches web sources, indexes them into vector DB
- Use embeddings (OpenAI) + Pinecone for retrieval
- LLM prompting that outputs structured ICP sections (Segment, Persona, Jobs, Goals, Channels, Sources)
- Attach source snippets and URLs for each generated claim
- Export ICP as PDF and JSON

3) Content & Ads generator (basic)
- Short-form captions, ad copy, and a 3-variant ad set per ICP
- Basic channel-optimized outputs (LinkedIn, Instagram, Facebook)

4) Payments & gating
- Stripe Checkout for cards
- Razorpay or UPI for Indian buyers
- Basic subscription / one-off purchase gating

5) Admin dashboard (minimal)
- View users, invoices, usage; moderate generated content; basic logs

6) PDF export & sharing
- HTML-first templates rendered to PDF (Puppeteer)
- Shareable, access-controlled links

7) Evidence provenance UI
- Panel showing sources used (URL, snippet, retrieval score)
- Allow user to remove or edit sources before exporting

Should-have (post-MVP)
- Strategy builder (positioning, acquisition plan) derived from ICP
- Template library & downloadable templates (Notion, Loom workflows)
- Team workspaces and role-based permissions
- Basic cohort/coaching features (Telegram/WhatsApp integration)

Nice-to-have (future)
- Self-hosted LLM option / hybrid stack for cost savings
- Marketplace for templates & community plug-ins
- Advanced analytics / A/B testing support

Prioritized User Stories & Acceptance Criteria
US-001: As a user, I can sign up and create a project so I can generate an ICP.
- Acceptance: User can register, verify email, and create a named project.

US-002: As a user, I can input a company or seed data and generate an ICP with sources.
- Acceptance: Generation completes (or queues) and output includes sections and at least 3 source URLs per major claim. PDF export must include "Sources" section.

US-003: As a user, I can purchase a one-off ICP report or subscribe to monthly usage.
- Acceptance: Stripe / Razorpay checkout completes; user access is updated.

US-004: As a user, I can generate ad copy variations based on generated ICP.
- Acceptance: System produces 3 ad variants per channel with source grounding.

Technical approach (MVP)
- Frontend: Next.js (React + TypeScript) deployed on Vercel. UI kit: TailwindCSS / Headless UI.
- Auth / DB / Storage: Supabase (Auth + Postgres + Storage) for low-ops integration and built-in Postgres for relational needs.
- Vector DB: Pinecone (managed) for retrieval. Alternative fallback: Supabase + pgvector if cost pressures arise.
- Embeddings & LLM: OpenAI (configurable via adapter). Support OpenRouter / other endpoints via adapter layer for easy switching.
- Background jobs: Simple queue (Redis + BullMQ) or serverless job runner. For low ops, use Cloud Run / Fargate container running worker consuming Redis.
- PDF generation: HTML templates rendered via Puppeteer in a small worker container.
- Hosting & infra: Vercel for frontend; Supabase (hosted tier) for DB; Pinecone for vector; small Cloud Run/Fargate worker for background tasks; Redis (managed) for job queue.

Domain-specific considerations from ICP PDF
- Payment friction is a primary barrier (see [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)). Ensure INR pricing and UPI / Razorpay available at checkout.
- Mobile-first flow: many users consume content via mobile. Prioritize responsive UI and light-weight exports (PDFs and short previews).
- Evidence & local case studies: provide UI to surface India/EM-specific sources and sample case studies in the report.
- Community channels: WhatsApp/Telegram integration is high-impact but can be deferred to post-MVP.

Minimal data model highlights (high-level)
- users (id, email, name, plan, billing_id)
- projects (id, user_id, name, settings)
- icp_reports (id, project_id, status, prompt_inputs, output_json, pdf_url, created_at)
- embeddings_index (index_id, source_url, snippet, metadata)
- jobs (id, type, payload, status)

Cost estimates & budget guidance (target < $1,000/mo)
- Vercel Hobby / Pro: $0–$20–$40
- Supabase (Auth + Postgres + Storage): free tier to $25–$100 for reasonable usage
- Pinecone (starter): $50–$200 depending on index size and QPS
- OpenAI: dominant cost. For conservative usage (1k ICPs/mo with optimized prompts / batching), estimate $200–$700/month (high variance). Implement prompt budget/quotas.
- Small worker host (Cloud Run / Render): $10–$100
- Stripe / Razorpay fees: variable per transaction (~2–4% + fixed)
- Total: realistic initial runway under $1,000/mo if LLM usage is controlled and heavy background scraping is limited.

Risk & mitigation
- LLM cost overruns: add usage quotas, warn users on expensive operations, and offer lower-cost plans (cached templates).
- Hallucinations: require RAG grounding, attach source snippets; expose provenance panel to users.
- Payment friction in India: integrate Razorpay/UPI and display INR pricing.

Deployment & roadmap (8-week sprint plan)
Week 0: Setup repositories, infra accounts (Vercel, Supabase, Pinecone, OpenAI, Stripe, Razorpay), and CI/CD skeleton.
Week 1: Implement Auth, project model, basic frontend skeleton and admin dashboard (skeleton).
Week 2: Implement a simple RAG pipeline: basic web-scraper (or third-party source list), embedding with OpenAI, index into Pinecone, simple find+prompt to produce a baseline ICP.
Week 3: Build PDF templates and export pipeline; add provenance panel in UI; wire job queue and worker for generation tasks.
Week 4: Payments (Stripe + Razorpay) and gating flows; ensure billing state maps to access control.
Week 5: Implement Content/Ads generator and small templates library; add export and share links.
Week 6: Polish UX, add rate-limiting and usage quotas, add Sentry monitoring and basic analytics; begin beta testing with early users.
Week 7–8: Collect feedback, fix issues, optimize prompts, add Notion/Typeform integrations as quick wins.

Acceptance criteria for launch
- Users can sign up and create a project.
- ICP generator returns structured ICP with at least three evidence sources per major claim and exports to PDF.
- Payment flows successfully process a purchase and unlock gated features.
- Basic ad/content generation works and is linked to ICP outputs.
- Admin can view users and usage metrics and moderate content.

Next actions (what I will create next)
- Detailed component architecture & Mermaid diagrams: [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)
- Stack-by-stack analysis files: frontend, backend, data-storage, ml-pipeline, integrations, infrastructure, security, observability, cost
- ICP-specific insights document: [`docs/archDecisions/ICP-insights.md`](docs/archDecisions/ICP-insights.md:1)
- Implementation roadmap and effort estimates: [`docs/archDecisions/roadmap.md`](docs/archDecisions/roadmap.md:1)

If this MVP scope looks good I will create [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1) next and include Mermaid diagrams (component + sequence + data flow). Please confirm or request adjustments.