# ICP-derived insights and architectural refinements (Simplified for MVP Phase 1)

Purpose
This document extracts actionable product and architecture requirements from the sample ICP [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1) and maps them to concrete changes in the system design, specifically within the Supabase-first MVP architecture.

Executive summary
- The ICP PDF shows Elsa-like outputs must be evidence-first, mobile-friendly, locally aware (India/EM), and payment-aware (INR/UPI). The report structure (Persona, Jobs-to-be-done, Goals, Problems, Sources, Channels) must be preserved, with provenance (URLs/snippets) for each claim.
- Key behavioural patterns from the PDF: side-hustle founders need low-cost, high-trust validation tools, rapid actionable wins, and community/accountability features (WhatsApp/Telegram). Payment friction is a primary conversion blocker.

Top-level implications for the simplified architecture
1.  **Evidence & provenance everywhere:**
    -   Every generated claim must link to source snippet(s) and retrieval scores; store mappings in the `provenance_mappings` table within Supabase Postgres.
    -   UI must expose an editable provenance panel that allows removing or adding sources before finalizing exports.
    -   See retrieval and provenance design in [ML/ICP generation pipeline (Simplified for MVP Phase 1)](docs/archDecisions/ml-pipeline.md:1).

2.  **Mobile-first UX and offline-friendly exports:**
    -   The app must be responsive and optimized for low-bandwidth; PDF/JSON exports allow users to share and read offline.
    -   The frontend doc [Frontend architecture and decisions (Simplified for MVP Phase 1)](docs/archDecisions/frontend.md:1) emphasizes a SaaS starter template that supports mobile-first design and compact views.

3.  **Local payments and pricing displays:**
    -   Support INR pricing and UPI/Razorpay flows. Display localized pricing and a payment-experience optimized for Indian buyers to reduce checkout abandonment.
    -   Integrations in [Integrations — payments, connectors, and webhooks (Simplified for MVP Phase 1)](docs/archDecisions/integrations.md:1) confirm Razorpay and Stripe integration via Supabase Edge Functions.

4.  **Source types and ingest connectors:**
    -   Users rely on Notion, Loom, Tally, surveys (Zoho/Typeform), WhatsApp/Telegram groups and public articles. For MVP Phase 1, focus on direct uploads (PDF/DOCX) and basic webhook-driven form connectors.
    -   Worker ingestion (**Supabase Functions**) must normalize these inputs into chunked passages with metadata (source_type, source_owner, language).

5.  **Prioritize "fast validation" and two-tier generation modes:**
    -   Offer "fast" quick ICP (small retrieval set, low-cost) and "deep" paid ICP (large retrieval, reranking, cross-encoding).
    -   Expose this in the API and UI; **Supabase Functions** workers should tag jobs with mode and budget estimate.

6.  **Community and cohort integration (Post-MVP consideration):**
    -   Export / scheduling hooks for WhatsApp/Telegram for cohort nudges and accountability. Consider using webhooks and third-party bots rather than hosting chat, implemented as **Supabase Functions**.

Detailed changes to ML & retrieval pipeline
-   **Source selection bias:** Include country and region filters in metadata (e.g., `region=IN`) in `pgvector` so the retriever can prefer India/EM sources when target geography is India.
-   **Evidence thresholds:** Require N supporting snippets with min `retrieval_score` to mark a claim as "high confidence." Otherwise mark as "insufficient evidence" in the output JSON.
-   **Provenance schema extension:** `provenance_mappings` table now store fields `{source_url, domain, snippet_text, retrieval_score, publication_date, source_type}` for full traceability.
-   **Caching & re-use:** Many ICPs share common public sources; cache embeddings and retrieval results by seed-hash to reduce cost, storing these in Supabase Postgres.
-   More detail in [ML / ICP generation pipeline (Simplified for MVP Phase 1)](docs/archDecisions/ml-pipeline.md:1).

Data model updates (aligned with Supabase Postgres)
-   `icp_reports.output_json`: extend schema to include "provenance_map" and "confidence_scores" per section.
-   `sources` table: add columns (`source_type`, `language`, `region`, `published_at`, `raw_storage_path`).
-   `user_uploaded_documents` table: manage user consent metadata (`consent_for_processing`, `consent_for_training`).

UI & UX requirements (mapped to architecture)
-   **Provenance panel:** Show top-k snippets per claim with domain, snippet, `retrieval_score`, and toggle to include in export.
-   **Evidence visual cues:** Confidence badges (high/medium/low); show "insufficient evidence" alerts with recommended actions (add sources or run deep research).
-   **Payment flows:** Inline Razorpay widget for INR; clear messaging about refunds and local support to build trust.

Integrations & channel strategy
-   High priority integrations for MVP: Razorpay, Stripe, and basic webhook-driven connectors (Typeform/Tally).
-   All backend integration logic implemented as **Supabase Functions** or handled by **Supabase Edge Functions** for webhooks.
-   Documented in [Integrations — payments, connectors, and webhooks (Simplified for MVP Phase 1)](docs/archDecisions/integrations.md:1).

Security, privacy & legal implications from the PDF content
-   Explicit consent tracking: users must consent to processing uploaded docs; store consent timestamps and allow revocation in Supabase Postgres.
-   Opt-out training: default to not using private user content for model training unless opted in.
-   PII handling: redact contact data from snippets stored for retrieval, or store pointers (hashes) and show redacted snippets in public contexts.

Operational & performance implications
-   Expect variable load: short quick jobs vs deeper jobs that cost more tokens. Use Postgres-based job queuing and quota enforcement (managed by Supabase Functions/Edge Functions) to avoid runaway LLM bills.
-   ETA estimation: provide queue position and estimated time-to-completion for deep jobs; surface cost estimate prior to starting. All within the Supabase execution environment.

Acceptance criteria guided by the PDF
-   Generated ICP must include a "Sources" section with at least 3 unique domain citations per major ICP claim for the financial/business claims.
-   Exported PDF must reproduce the ICP structure (Segment, Persona, Jobs, Goals, Problems, Channels, Sources) and include provenance appendix.
-   Checkout must support INR and at least one local payment method (Razorpay or UPI) for India.

Suggested ICP JSON schema (field-level mapping)
```json
{
  "segment": "...",
  "persona": {
    "name": "...",
    "age_range": "...",
    "job_titles": [...],
    "personality_traits": [...],
    "evidence": [{ "source_url":"...", "snippet_id":"...", "score":0.8 }]
  },
  "jobs_to_be_done": [...],
  "goals": [...],
  "problems": [...],
  "pains": [...],
  "triggers": [...],
  "barriers": [...],
  "channels": [...],
  "tools_used": [...],
  "sources": [{ "source_url":"...", "domain":"...", "type":"article|survey|notion", "snippet":"...", "score":0.72 }],
  "confidence_scores": { "persona":0.85, "jobs":0.78 },
  "metadata": { "generated_at":"", "model_version":"", "region_focus":"IN" }
}
```

Prioritized roadmap items driven by PDF insights
1)  Evidence + provenance UI (must-have)
2)  INR pricing + Razorpay/UPI checkout (must-have)
3)  Fast vs Deep generation modes with clear cost/ETA (must-have)
4)  Direct PDF/DOCX upload connectors (high priority)
5)  WhatsApp/Telegram cohort integration (medium)
6)  Localized examples / India case studies baked into templates (medium)

Testing & validation
-   Build a small test corpus of ICP PDFs and public case studies to validate that retrieval from `pgvector` returns supporting snippets and that the LLM (OpenRouter via adapter) produces schema-compliant outputs.
-   Human-in-the-loop review: recruit a small group of early users to verify claims and rate hallucination frequency.

Next steps (concrete)
-   Ensure `data-storage.md` reflects all these schema changes.
-   Update the RAG prompt templates to require "insufficient_evidence" when claims lack supporting snippets.
-   Implement Razorpay integration using Supabase Edge Functions and add INR display to checkout flows (frontend).
-   Add the sample PDF to the evaluation test set and create unit tests.

Owner: Roo (architect)
Last updated: 2025-10-25
