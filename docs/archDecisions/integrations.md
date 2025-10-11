# Integrations — payments, connectors, and webhooks

Purpose
This document describes integration patterns, recommended providers, security, and operational considerations for payments, content connectors, and webhook handling for Phase 1 (MVP) and Phase 2 of the product.

Scope
- Phase 1: Stripe (global) + Razorpay (India) payments, direct file uploads (PDF/DOCX), basic form/webhook connectors (Typeform/Tally), Telegram bot for notifications, transactional email (SendGrid/SES), and a robust webhook handling service.
- Phase 2: Notion & Google Docs connectors (OAuth), Loom embeds & API, Zoho surveys, WhatsApp Business integration (via provider), deeper connector syncs and cohort messaging features.

Principles
- Favor managed providers to reduce ops burden (Stripe, Razorpay, SendGrid).
- Keep provider-specific logic behind adapter interfaces to allow swapping vendors.
- Enforce secure token storage, signature verification, idempotency, and strong observability on all integration flows.
- Explicit user consent required for processing/uploaded/private content.

Payments (Phase 1)
Overview
- Phase 1 must support one-off purchases and simple subscriptions with INR-localized flows for India and global card support elsewhere.
- Key requirements: checkout UX, webhook-driven entitlement provisioning, invoices/receipts, refunds, idempotent processing, and webhook verification.

Providers and roles
- Stripe (recommended): global cards, subscriptions, invoices, hosted Checkout to reduce PCI scope.
- Razorpay (recommended for India): UPI, local wallets, card support and lower friction for Indian buyers.

Implementation details
- Checkout UX: use Stripe Checkout for international card flows and Razorpay Checkout for INR/UPI flows. Decide routing by user locale or explicit selection.
- Currency handling: store prices in smallest currency unit (cents/paise) and persist provider_charge_id, provider, and exchange rate into billing records.
- Subscriptions: Stripe Subscriptions for recurring access; consider Razorpay Subscriptions if large IN audience requires it.
- Webhooks: verify provider signatures (Stripe and Razorpay) on /api/v1/webhooks/* endpoints. Process webhooks idempotently and enqueue entitlement provisioning.
- Refunds & disputes: process via provider APIs and update internal billing state and access revocations accordingly.

Security & compliance
- Avoid handling raw card data: prefer hosted provider solutions (Stripe Checkout).
- Store secrets (API keys) in a secrets manager (e.g., Cloud KMS / AWS Secrets Manager).
- Rotate keys and monitor for suspicious events.
- Log webhook payloads for a limited retention (e.g., 30 days) and mask PII in logs.

Invoices & receipts
- Use provider-hosted receipts and store links or cached PDF copy in `billing_invoices`.
- Include tax/GST fields for India if needed (Phase 2 enhancements).

Payments operational checklist (Phase 1)
- Stripe Checkout + test keys integrated and webhook signature verification implemented
- Razorpay Checkout + UPI flows integrated and webhook verification implemented
- Receipt/invoice storage and UI for download
- Admin refund and reconciliation UI

Connector patterns (Phase 1 & 2)
Connector design principles
- Implement an adapter interface for each connector (connect, refresh, fetch, webhookHandler).
- All connectors use server-side OAuth where applicable (Notion, Google).
- Store provider tokens encrypted and associate metadata (scopes, expiry, refresh token).
- Provide UI to connect, inspect, and revoke connectors; record consent and scope.

Direct uploads (Phase 1)
- Accept PDF, DOCX, TXT; limit file size (Phase 1 e.g., 10–50MB).
- Ingest pipeline: validation -> (optional) virus scan -> text extraction -> chunking -> embedding -> index.
- Require explicit consent checkboxes: `consent_for_processing` and `consent_for_training` flags.

Notion connector (Phase 2)
- OAuth 2.0 app with minimal scopes for read-only content export.
- Initial full export of selected pages and incremental sync using change notifications or periodic polling.
- Map Notion pages to source records with `source_url`, preserve block-level metadata.

Google Drive & Google Docs (Phase 2)
- OAuth 2.0 (Drive & Docs scopes). Use Drive export endpoints to convert Docs to HTML/plaintext.
- Use Drive push notifications (Drive watch) for incremental updates where possible.

Loom (Phase 2)
- Accept Loom links and attempt to fetch captions/transcripts via available APIs; fall back to asking user-supplied transcripts if not available.

Typeform / Tally / Zoho Survey (Phase 1/2)
- Prefer webhook-driven ingestion. Configure form provider webhooks to send responses to `/api/v1/connectors/webhook`.
- Verify provider webhook signatures or use secret tokens.
- Parse responses and map to structured source documents for indexing.

Messaging / cohort channels
Telegram (Phase 1)
- Use Bot API for notifications and invites. Flow: user opts in -> backend stores chat id -> send templated messages -> optionally accept replies.
- Bot webhooks receive replies to capture user interactions.

WhatsApp (Phase 2)
- Use third-party providers (Twilio, 360dialog, Gupshup) for WhatsApp Business API access.
- Must collect explicit opt-in; pre-approve templates for outbound messages.

Webhook handling design
Generic webhook receiver responsibilities
- Endpoint pattern: `/api/v1/webhooks/{provider}`
- Verification: validate signature header/provider-specific security
- Idempotency: use provider event id or compute idempotency key; persist webhook events and prevent double-processing
- Enqueue raw payload to job queue (worker) for asynchronous processing
- Store raw payloads for limited retention for debugging

Signature verification examples
- Stripe: use `stripe.webhooks.constructEvent` with endpoint secret
- Razorpay: HMAC-SHA256 compare with secret
- Provider-specific secret/token validation for Typeform/Tally

Idempotency & observability
- Persist `webhook_event` with fields: provider_event_id, provider, received_at, processed, attempts.
- Use idempotency keys in action jobs to avoid duplicated grants/refunds.
- Metrics: total webhooks, failure rate, average processing latency, DLQ size.

Retry, backoff, and DLQ
- Use exponential backoff with jitter for transient errors (e.g., 1s, 2s, 5s, 15s, 60s).
- After a configured attempt limit (default 5), route job to DLQ and alert ops.
- Provide UI for manual replays from DLQ.

Rate limiting and batching
- Implement per-provider rate limits (token-bucket).
- Batch calls to expensive APIs such as embeddings where provider supports batching.
- Honor `Retry-After` headers and backoff instructions.

Security & token management
- Encrypt tokens in KMS-backed storage; access tokens available only to server components.
- Implement token refresh flows and scheduled rotation.
- Revocation: support disconnect flows that revoke provider tokens where API supports.

Privacy & data handling rules
- Only process content when user has given consent.
- Record consent timestamps and flags in `user_uploaded_documents` and connectors metadata.
- Offer deletion endpoints that remove associated sources, chunks, embeddings, and PDFs; ensure connector revocation as requested.

Monitoring & debugging
- Dashboard for webhook throughput, failure rates, average processing time, and DLQ alerts.
- Correlate webhooks with processing traces (OpenTelemetry) and job ids.
- Keep masked raw payloads for a configurable retention period.

Developer experience
- Local webhook testing tools and replay capabilities.
- Connector simulators for Notion/Google/Typeform to test integrations without real credentials.
- Mock provider responses in CI for contract tests.

Testing & QA
- Use sandbox/test modes: Stripe test keys, Razorpay test mode.
- Integration tests for webhooks with replay and idempotency assertions.
- Contract tests for connector adapters.

Operational runbooks
- Failed webhook: inspect raw payload, attempt replay, escalate or move to DLQ.
- Key rotation: steps to swap secrets, validate, and rollback if necessary.
- Payment incidents: reconciliation steps, manual refunds, and user support playbook.

Acceptance criteria (Phase 1)
- Stripe + Razorpay checkout flows work end-to-end; webhooks processed and verified; entitlements provisioned idempotently.
- File uploads ingest pipeline indexes content and adds sources to vector store.
- Telegram notification flow implemented for opted-in users.
- Webhook processing includes retries/backoff and DLQ behavior; basic monitoring in place.

File locations & code references
- payments adapter: [`src/services/payments/adapter.ts`](src/services/payments/adapter.ts:1)  
- stripe implementation: [`src/services/payments/stripe.ts`](src/services/payments/stripe.ts:1)  
- razorpay implementation: [`src/services/payments/razorpay.ts`](src/services/payments/razorpay.ts:1)  
- webhook receiver: [`src/api/webhooks/receiver.ts`](src/api/webhooks/receiver.ts:1)  
- connector adapters: [`src/services/connectors/*.ts`](src/services/connectors/*.ts:1)  
- ingestion worker: [`src/workers/ingest-worker.ts`](src/workers/ingest-worker.ts:1)  

Next steps
- Implement payments adapter and webhook receiver in staging; test with provider sandbox/test keys.
- Implement file upload ingestion pipeline and wire to embeddings pipeline (Phase 1).
- Add connector adapters for Typeform and Tally to accept webhook responses.
- Iterate with monitoring and add more connectors (Notion, Google) in Phase 2.

Owner: Roo (architect)  
Last updated: 2025-10-11