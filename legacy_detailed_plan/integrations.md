# Integrations — payments, connectors, and webhooks (Simplified for MVP Phase 1)

Purpose
This document describes integration patterns, recommended providers, security, and operational considerations for payments, content connectors, and webhook handling for Phase 1 (MVP), aligning with the Supabase-first simplified architecture.

Scope
- Phase 1: Stripe (global) + Razorpay (India) payments, direct file uploads (PDF/DOCX), basic form/webhook connectors (Typeform/Tally), Telegram bot for notifications, transactional email, and robust webhook handling via Supabase Edge Functions.
- Phase 2: Notion & Google Docs connectors (OAuth), Loom embeds & API, Zoho surveys, WhatsApp Business integration (via provider), deeper connector syncs and cohort messaging features.

Principles
- Favor managed providers to reduce ops burden (Stripe, Razorpay, transactional email service).
- Keep provider-specific logic behind adapter interfaces to allow swapping vendors.
- Enforce secure token storage, signature verification, idempotency, and strong observability on all integration flows, leveraging Supabase security features.
- Explicit user consent required for processing/uploaded/private content.

Payments (Phase 1)
Overview
- Phase 1 must support one-off purchases and simple subscriptions with INR-localized flows for India and global card support elsewhere.
- Key requirements: checkout UX (leveraging SaaS starter), webhook-driven entitlement provisioning using Supabase Edge Functions, invoices/receipts, refunds, idempotent processing, and webhook verification.

Providers and roles
- **Stripe (recommended):** Global cards, subscriptions, invoices, hosted Checkout to reduce PCI scope.
- **Razorpay (recommended for India):** UPI, local wallets, card support and lower friction for Indian buyers.

Implementation details
- **Checkout UX:** Leverage SaaS starter template's Stripe integration for international card flows. For INR/UPI flows, integrate Razorpay Checkout. Routing can be determined by user locale or explicit selection.
- **Currency handling:** Store prices in smallest currency unit (cents/paise) and persist provider_charge_id, provider, and exchange rate into billing records in Supabase Postgres.
- **Subscriptions:** Stripe Subscriptions for recurring access, extending the starter template's functionality.
- **Webhooks:** Use **Supabase Edge Functions** to receive and verify provider signatures (Stripe and Razorpay) on `/api/v1/webhooks/*` endpoints. Edge Functions process webhooks idempotently and can trigger Supabase Function workers for entitlement provisioning.
- **Refunds & disputes:** Process via provider APIs, updating internal billing state and access revocations in Supabase Postgres.

Security & compliance
- Avoid handling raw card data: prefer hosted provider solutions (Stripe Checkout).
- Store secrets (API keys) in Supabase Secrets or as environment variables for Edge Functions/Functions.
- Rotate keys and monitor for suspicious events.
- Log webhook payloads for a limited retention (e.g., 30 days) and mask PII in logs.

Invoices & receipts
- Use provider-hosted receipts and store links or cached PDF copy in `billing_invoices` table.
- Include tax/GST fields for India if needed (Phase 2 enhancements).

Payments operational checklist (Phase 1)
- Stripe Checkout + test keys integrated via SaaS starter and webhook signature verification implemented in Supabase Edge Function.
- Razorpay Checkout + UPI flows integrated and webhook verification implemented in Supabase Edge Function.
- Receipt/invoice storage in Supabase Storage and UI for download.
- Admin refund and reconciliation UI.

Connector patterns (Phase 1 & 2)
Connector design principles
- Implement an adapter interface for each connector (connect, refresh, fetch, webhookHandler) within Supabase Functions.
- All connectors use server-side OAuth where applicable (Notion, Google).
- Store provider tokens encrypted in Supabase Postgres and associate metadata (scopes, expiry, refresh token).
- Provide UI to connect, inspect, and revoke connectors; record consent and scope.

Direct uploads (Phase 1)
- Accept PDF, DOCX, TXT; limit file size (e.g., 10–50MB).
- Ingest pipeline (managed by a **Supabase Function**): validation -> (optional) virus scan -> text extraction -> chunking -> embedding -> index (`pgvector`).
- Require explicit consent checkboxes: `consent_for_processing` and `consent_for_training` flags.

Notion connector (Phase 2)
- OAuth 2.0 app with minimal scopes for read-only content export.
- Logic implemented as a **Supabase Function**.

Google Drive & Google Docs (Phase 2)
- OAuth 2.0 (Drive & Docs scopes). Use Drive export endpoints to convert Docs to HTML/plaintext.
- Logic implemented as a **Supabase Function**.

Loom (Phase 2)
- Accept Loom links and attempt to fetch captions/transcripts via available APIs; fall back to asking user-supplied transcripts if not available.
- Logic implemented as a **Supabase Function**.

Typeform / Tally / Zoho Survey (Phase 1/2)
- Prefer webhook-driven ingestion. Configure form provider webhooks to send responses to a **Supabase Edge Function** endpoint.
- Edge Function verifies provider webhook signatures or uses secret tokens.
- Edge Function parses responses and triggers a **Supabase Function** worker to map responses to structured source documents for indexing.

Messaging / cohort channels
Telegram (Phase 1)
- Use Bot API for notifications and invites. Flow handled by a **Supabase Function**: user opts in -> backend stores chat id -> send templated messages -> optionally accept replies.
- Bot webhooks receive replies handled by a **Supabase Edge Function**.

WhatsApp (Phase 2)
- Use third-party providers (Twilio, 360dialog, Gupshup) for WhatsApp Business API access.
- Logic implemented as a **Supabase Function**.

Webhook handling design
Generic webhook receiver responsibilities (**Supabase Edge Functions**)
- Endpoint pattern: `/api/v1/webhooks/{provider}`
- Verification: validate signature header/provider-specific security.
- Idempotency: use provider event id or compute idempotency key; persist webhook events (e.g., in a `webhook_events` table in Supabase Postgres) and prevent double-processing.
- Enqueue raw payload to a Postgres-based job queue (triggering a **Supabase Function** worker) for asynchronous processing.
- Store raw payloads for limited retention for debugging.

Signature verification examples (within Supabase Edge Functions)
- Stripe: use `stripe.webhooks.constructEvent` with endpoint secret.
- Razorpay: HMAC-SHA256 compare with secret.
- Provider-specific secret/token validation for Typeform/Tally.

Idempotency & observability
- Persist `webhook_event` table with fields: `provider_event_id`, `provider`, `received_at`, `processed`, `attempts`.
- Use idempotency keys in action jobs within Supabase Functions to avoid duplicated grants/refunds.
- Metrics: total webhooks, failure rate, average processing latency, DLQ size (metrics derived from Supabase logs and custom metrics).

Retry, backoff, and DLQ
- Use internal Supabase Function retry mechanisms or job queue retry logic.
- After a configured attempt limit, route job to a DLQ within Postgres and alert ops.
- Admin UI can provide for manual replays from DLQ.

Rate limiting and batching
- Implement per-provider rate limits in Supabase Edge Functions.
- Batch calls to expensive APIs such as embeddings where provider supports batching (within Supabase Functions).
- Honor `Retry-After` headers and backoff instructions.

Security & token management
- Encrypt tokens in Supabase Secrets; access tokens available only to Supabase Functions/Edge Functions.
- Implement token refresh flows and scheduled rotation.
- Revocation: support disconnect flows that revoke provider tokens where API supports.

Privacy & data handling rules
- Only process content when user has given consent (recorded in `user_uploaded_documents` table).
- Offer deletion endpoints that remove associated sources, chunks, embeddings (`pgvector`), and PDFs (Supabase Storage); ensure connector revocation as requested.

Monitoring & debugging
- Dashboard for webhook throughput, failure rates, average processing time, and DLQ alerts leveraging Supabase logging and monitoring tools.
- Correlate webhooks with processing traces (OpenTelemetry) and job ids within Supabase context.
- Keep masked raw payloads for a configurable retention period.

Developer experience
- Local webhook testing tools and replay capabilities via Supabase CLI.
- Connector simulators for Notion/Google/Typeform to test integrations without real credentials.
- Mock provider responses in CI for contract tests within the Supabase build context.

Testing & QA
- Use sandbox/test modes: Stripe test keys, Razorpay test mode.
- Integration tests for webhooks with replay and idempotency assertions, targeting Supabase Edge Functions.
- Contract tests for connector adapters (Supabase Functions).

Operational runbooks
- Failed webhook: inspect raw payload in Supabase logs, attempt replay, escalate or move to DLQ.
- Key rotation: steps to swap secrets in Supabase Secrets, validate, and rollback if necessary.
- Payment incidents: reconciliation steps, manual refunds, and user support playbook.

Acceptance criteria (Phase 1)
- Stripe + Razorpay checkout flows work end-to-end; webhooks processed and verified by Supabase Edge Functions; entitlements provisioned idempotently by Supabase Functions.
- File uploads ingest pipeline indexes content and adds sources to `pgvector`.
- Telegram notification flow implemented for opted-in users (Supabase Functions).
- Webhook processing includes retries/backoff and DLQ behavior; basic monitoring leveraging Supabase tools.

File locations & code references (within Supabase structure)
- payments adapter: `supabase/functions/payments/adapter.ts`
- stripe implementation: `supabase/functions/payments/stripe.ts`
- razorpay implementation: `supabase/functions/payments/razorpay.ts`
- webhook receiver: `supabase/functions/webhooks/receiver.ts` (Edge Function)
- connector adapters: `supabase/functions/connectors/*.ts`
- ingestion worker: `supabase/functions/ingest-worker.ts`

Next steps
- Implement payments adapter functions and webhook receivers as Supabase Edge Functions/Functions; test with provider sandbox/test keys.
- Implement file upload ingestion pipeline and wire to `pgvector` embeddings Pipeline (Phase 1).
- Add connector adapters for Typeform and Tally, received by Edge Functions and processed by Supabase Functions.
- Iterate with monitoring and add more connectors (Notion, Google) in Phase 2.

Owner: Roo (architect)
Last updated: 2025-10-25