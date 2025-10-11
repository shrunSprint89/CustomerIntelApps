# Data storage & schema design

Purpose
This document defines the data storage choices, relational schema, vector metadata, retention and compliance policies for the MVP.

Overview
- Primary relational store: Supabase Postgres (managed Postgres)
- Vector store: Pinecone (managed) with a fallback option for pgvector (Supabase)
- Object storage: Supabase Storage (S3-compatible) or AWS S3
- Queue / cache: Redis (managed) for job queues and rate limiting

Principles
- Evidence-first: Every generated claim must have provenance (source snippets + retrieval score) persisted.
- Minimal PII: store minimal personal data and support erasure (GDPR/CCPA).
- Tenant isolation: row-level security and metadata tagging; optional per-tenant namespaces in Pinecone.
- Cost-aware: cache embeddings, deduplicate chunks, and expire old raw content.

High-level architecture (data components)
- Relational DB: user/accounts, projects, auth, reports metadata, billing, provenance mapping.
- Vector DB: embeddings and similarity search (Pinecone or pgvector).
- Object storage: raw crawled pages, uploaded documents, generated PDFs.
- Cache/Queue: Redis for BullMQ job queue, idempotency keys, rate limiting.

Core relational schema (tables overview)
- users
- projects
- icp_reports
- sources
- source_chunks
- provenance_mappings
- embeddings_meta (for pgvector option)
- jobs
- user_uploaded_documents
- invoices / billing
- audit_logs

Table definitions (recommended columns)

users
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
```

projects
```sql
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
```

icp_reports
```sql
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
```

sources
```sql
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
```

source_chunks
```sql
CREATE TABLE source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  chunk_tokens integer,
  chunk_hash text UNIQUE NOT NULL, -- dedup key (sha256)
  created_at timestamptz DEFAULT now()
);
```

provenance_mappings
```sql
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
```

embeddings_meta (pgvector option)
```sql
CREATE TABLE embeddings_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid REFERENCES source_chunks(id),
  embedding vector(1536), -- pgvector type if using pgvector
  vector_dim int DEFAULT 1536,
  created_at timestamptz DEFAULT now()
);
```

jobs
```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text,
  payload jsonb,
  attempts int DEFAULT 0,
  status text DEFAULT 'queued',
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

user_uploaded_documents
```sql
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
```

billing_invoices
```sql
CREATE TABLE billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  provider text, -- stripe | razorpay
  provider_charge_id text,
  amount_cents int,
  currency text,
  status text, -- paid | pending | refunded
  created_at timestamptz DEFAULT now()
);
```

audit_logs
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

Indexing & performance recommendations
- Create b-tree indexes for foreign keys and frequently filtered columns: users(email), projects(user_id), icp_reports(project_id, status), sources(domain).
- Create GIN indexes for JSONB queries used in filters (e.g., prompt_inputs, settings).
- For full-text search on chunk_text, maintain a tsvector column and GIN index:

```sql
ALTER TABLE source_chunks ADD COLUMN chunk_tsv tsvector;
CREATE INDEX idx_source_chunks_chunk_tsv ON source_chunks USING GIN (chunk_tsv);
```

- For pgvector, create an index on the embedding column:

```sql
CREATE INDEX ON embeddings_meta USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Vector store integration patterns
- Pinecone (managed)
  - Upsert vectors with metadata: {chunk_id, source_id, domain, created_at, language}
  - Use namespaces per environment; consider per-tenant namespace for enterprise isolation.
- pgvector (fallback)
  - Store embeddings in embeddings_meta.embedding and use SQL <-> operator to compute similarity.
  - Example query (pgvector):
```sql
SELECT sc.id, sc.chunk_text, em.embedding <#> embed($1) as distance
FROM embeddings_meta em
JOIN source_chunks sc ON sc.id = em.chunk_id
ORDER BY em.embedding <#> embed($1)
LIMIT 5;
```

Embedding caching & deduplication
- Compute chunk_hash (SHA256) for each chunk; check existence before embedding.
- Maintain a cache table or use source_chunks.chunk_hash unique constraint.
- Batch embeddings to provider and upsert.

Retention & purge policies
- Raw crawled HTML/PDF: default 90 days (configurable per org)
- Source chunks & embeddings: default 180 days; archive vectors and metadata older than retention to cold storage
- Reports: keep metadata indefinitely; archive older PDFs to cheaper storage after 1 year
- Retention controls must be exposed in admin UI

Backup & disaster recovery
- Postgres: daily automated backups (point-in-time recovery if available) with 30-day retention.
- Object storage: cross-region replication or regular snapshot exports to secondary bucket.
- Pinecone: export index snapshots to object storage periodically (if supported), or maintain periodic export of vector metadata and chunk ids.
- Test restore process quarterly.

Security & compliance
- Encrypt database volumes at rest (managed by cloud provider) and use TLS in transit.
- Use Supabase Row-Level Security (RLS) policies to enforce tenant isolation.
- Mask/hide PII in logs; use redaction for snippet_text in audit logs.
- Consent recording: user_uploaded_documents.consent_for_processing must be true to process user-uploaded docs.
- Provide data export and deletion endpoints that purge related sources, chunks, embeddings, and PDFs. Coordinate vector deletions with Pinecone.

Multi-region & data residency
- For MVP, deploy primary Postgres in single region (closest to majority users). For enterprise, support data residency by deploying separate Supabase instances per region or partitioning data and using per-region Pinecone namespaces.

Schema migrations & developer workflow
- Use migration tooling (e.g., prisma migrate, node-pg-migrate, or Flyway). Store migrations in repo.
- Provide seed scripts for test/dev (small sample dataset) and a snapshot of reference ICP examples (from [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)).

Observability & data quality
- Instrument database slow queries and track long-running transactions.
- Monitor job queue depth, embedding failures, and index upsert error rates.
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
- Embedding storage: 200k vectors * 1536 dims * 4 bytes ≈ ~1.2 GB monthly raw (plus metadata). Pinecone/pricing will vary.
- Storage: raw HTML/PDF + PDFs maybe 10–50GB/month depending on retention and depth.

Next steps & references
- Implement schema migrations and create initial dev seed (use sample ICP from [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)).
- Wire Pinecone up in dev and populate a small index with a few sample sources.
- Integrate embedding caching and dedup logic in the ingestion worker. See [`docs/archDecisions/ml-pipeline.md`](docs/archDecisions/ml-pipeline.md:1) for pipeline specifics.

Owner: Roo (architect)
Last updated: 2025-10-11