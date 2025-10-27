# Data storage & schema design (Simplified for MVP Phase 1)

Purpose
This document defines the data storage choices, relational schema, vector metadata, retention and compliance policies for the MVP, with a strong focus on using Supabase Postgres with `pgvector` as the central data store.

Overview
- **Primary relational and vector store:** Supabase Postgres (managed Postgres with `pgvector` extension enabled)
- **Object storage:** Supabase Storage (S3-compatible)
- **Job Queue:** Postgres-based queue (managed within Supabase Postgres)

Principles
- Evidence-first: Every generated claim must have provenance (source snippets + retrieval score) persisted within Supabase Postgres.
- Minimal PII: store minimal personal data and support erasure (GDPR/CCPA).
- Tenant isolation: row-level security (RLS) within Supabase Postgres; metadata tagging for data ownership.
- Cost-aware: cache embeddings, deduplicate chunks, and expire old raw content, all managed within the Supabase ecosystem.
- Unified data platform: Consolidate relational data, vector embeddings, and job queue within Supabase Postgres to minimize operational overhead.

High-level architecture (data components)
- **Relational DB:** Supabase Postgres (user/accounts, projects, auth metadata, reports metadata, billing, provenance mapping, job queue).
- **Vector DB:** Supabase Postgres with `pgvector` (embeddings and similarity search).
- **Object storage:** Supabase Storage (raw crawled pages, uploaded documents, generated PDFs).

Core relational schema (tables overview)
- `users`
- `projects`
- `icp_reports`
- `sources`
- `source_chunks`
- `provenance_mappings`
- `embeddings_meta` (now **the primary** for vector embeddings)
- `jobs`
- `user_uploaded_documents`
- `billing_invoices`
- `audit_logs`

Table definitions (recommended columns)
**Note:** `embeddings_meta` now specifically refers to storing vectors with `pgvector` and is not an "option" but the chosen strategy for MVP.

```sql
-- users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'user', -- user, admin, support
  plan text DEFAULT 'free',
  stripe_customer_id text,
  razorpay_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  settings jsonb DEFAULT '{}'::jsonb, -- UI options, region focus, templates
  region_focus text, -- e.g., IN, GLOBAL
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- icp_reports table
CREATE TABLE icp_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued', -- queued, running, ready, failed
  mode text NOT NULL DEFAULT 'fast', -- fast | deep
  prompt_inputs jsonb, -- original inputs from user
  output_json jsonb, -- structured ICP output (schema-validated)
  pdf_url text, -- signed URL to exported PDF
  model_version text, -- e.g., gpt-4o-2025-09
  token_usage jsonb, -- per-run token counts/costs
  cost_in_cents integer DEFAULT 0, -- internal accounting
  confidence_scores jsonb, -- aggregated per-section
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- sources table
CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text UNIQUE,
  domain text,
  title text,
  source_type text, -- article | notion | google_doc | user_upload | loom | survey
  language text,
  published_at timestamptz,
  raw_storage_path text, -- object storage pointer for original HTML/PDF
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- source_chunks table
CREATE TABLE source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  chunk_tokens integer,
  chunk_hash text UNIQUE NOT NULL, -- dedup key (sha256)
  created_at timestamptz DEFAULT now()
);

-- provenance_mappings table
CREATE TABLE provenance_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES icp_reports(id) ON DELETE CASCADE,
  claim_path text NOT NULL, -- JSONPath or dot path within output_json (e.g., persona.jobs[0])
  chunk_id uuid REFERENCES source_chunks(id),
  source_id uuid REFERENCES sources(id),
  snippet_text text, -- exact snippet used
  retrieval_score double precision,
  created_at timestamptz DEFAULT now()
);

-- embeddings_meta table (using pgvector as primary vector store)
CREATE TABLE embeddings_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid REFERENCES source_chunks(id) ON DELETE CASCADE,
  embedding vector(1536), -- pgvector type, assuming 1536 dimensions for embeddings
  vector_dim int DEFAULT 1536,
  created_at timestamptz DEFAULT now()
);

-- jobs table (Postgres-based queue)
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'queued', -- queued, running, failed, completed
  attempts int DEFAULT 0,
  last_error text,
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- user_uploaded_documents table
CREATE TABLE user_uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  filename text,
  mime_type text,
  storage_path text,
  consent_for_processing boolean DEFAULT true,
  consent_for_training boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- billing_invoices table
CREATE TABLE billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  provider text NOT NULL, -- stripe | razorpay
  provider_charge_id text,
  amount_cents int NOT NULL,
  currency text NOT NULL,
  status text NOT NULL, -- paid | pending | refunded
  created_at timestamptz DEFAULT now()
);

-- audit_logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

Indexing & performance recommendations
- Create b-tree indexes for foreign keys and frequently filtered columns: `users(email)`, `projects(user_id)`, `icp_reports(project_id, status)`, `sources(domain)`, `jobs(status, scheduled_at)`.
- Create GIN indexes for JSONB queries used in filters (e.g., `prompt_inputs`, `settings`, `jobs.payload`).
- For full-text search on `chunk_text`, maintain a `tsvector` column and GIN index:
```sql
ALTER TABLE source_chunks ADD COLUMN chunk_tsv tsvector;
CREATE INDEX idx_source_chunks_chunk_tsv ON source_chunks USING GIN (chunk_tsv);
```
- For `pgvector`, create an index on the embedding column. The `ivfflat` index is generally recommended:
```sql
CREATE INDEX ON embeddings_meta USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Vector store integration patterns (using `pgvector`)
- Store embeddings in `embeddings_meta.embedding` after generation via the LLM Adapter.
- Use SQL `<=>` operator for cosine similarity search (most common for vectors):
```sql
SELECT sc.id, sc.chunk_text, em.embedding <=> $1 as distance
FROM embeddings_meta em
JOIN source_chunks sc ON sc.id = em.chunk_id
ORDER BY em.embedding <=> $1
LIMIT 5;
```

Embedding caching & deduplication
- Compute `chunk_hash` (SHA256) for each chunk; check existence in `source_chunks` and `embeddings_meta` before embedding to avoid duplicate work.
- Leverage `source_chunks.chunk_hash` unique constraint for data integrity.

Retention & purge policies
- Raw crawled HTML/PDF: default 90 days in Supabase Storage (configurable per org).
- Source chunks & embeddings: default 180 days; archive vectors and metadata older than retention. (Within Postgres, this means careful `DELETE` operations or moving to cold storage if Supabase offers it).
- Reports: keep metadata indefinitely; archive older PDFs to cheaper storage after 1 year.
- Retention controls exposed in admin UI.

Backup & disaster recovery
- Supabase Postgres: automated daily backups (point-in-time recovery) with configurable retention.
- Supabase Storage: managed by Supabase; enable versioning for objects if needed.
- Test restore process quarterly.

Security & compliance
- Encrypt database volumes at rest (managed by Supabase) and use TLS in transit.
- Use Supabase Row-Level Security (RLS) policies to enforce tenant isolation and fine-grained access.
- Mask/hide PII in logs; use redaction for `snippet_text` in audit logs.
- Consent recording: `user_uploaded_documents.consent_for_processing` must be true to process user-uploaded docs.
- Provide data export and deletion endpoints that purge related sources, chunks, embeddings, and PDFs.

Multi-region & data residency
- For MVP, deploy primary Supabase deployment in a single region. Supabase offers multi-region options for future scale.

Schema migrations & developer workflow
- Use Supabase CLI for schema migrations. Store migrations in repo.
- Provide seed scripts for test/dev (small sample dataset) and a snapshot of reference ICP examples.

Observability & data quality
- Instrument database slow queries and track long-running transactions within Supabase Postgres.
- Monitor job queue depth (`jobs` table), embedding failures, and `pgvector` index upsert error rates via Supabase analytics.
- Add a data-quality dashboard showing counts of orphaned chunks, missing provenance entries, and failed exports.

Example retrieval & provenance query patterns
- Get top provenance snippets for a report:
```sql
SELECT pm.claim_path, s.domain, sc.chunk_text, pm.retrieval_score
FROM provenance_mappings pm
JOIN source_chunks sc ON sc.id = pm.chunk_id
JOIN sources s ON s.id = pm.source_id
WHERE pm.report_id = $1
ORDER BY pm.retrieval_score DESC
LIMIT 50;
```
- List reports for user with status counts:
```sql
SELECT p.id, p.name, r.status, count(*) OVER (PARTITION BY r.status) as status_count
FROM projects p
JOIN icp_reports r ON r.project_id = p.id
WHERE p.user_id = $1
ORDER BY r.created_at DESC;
```

Estimated sizing guidance (MVP)
- Assume 1000 reports/month, average 10 sources/report, average 20 chunks/source → ~200k chunks/mo.
- Embedding storage: 200k vectors * 1536 dims * 4 bytes ≈ ~1.2 GB monthly raw (plus metadata). This is managed efficiently by `pgvector` within Supabase Postgres.
- Storage: raw HTML/PDF + PDFs maybe 10–50GB/month depending on retention and depth in Supabase Storage.

Next steps & references
- Fully implement schema migrations and create initial dev seed.
- Implement embedding caching and dedup logic in the ingestion Supabase Function.
- [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25