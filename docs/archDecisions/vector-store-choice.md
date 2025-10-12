# Vector store choice — Pinecone vs pgvector (detailed rationale & migration plan)

Summary
Pinecone (managed) was chosen for the MVP because it removes most of the operational risk from vector search: it offers efficient ANN implementations, scalable and reliable indexing, metadata filtering, snapshots/exports, and straightforward upserts. That shortens time-to-market and reduces the chance of subtle retrieval bugs that can cause hallucinations. pgvector (Supabase/Postgres) is a lower-cost, simpler option for small-scale deployments and is an excellent fallback. This document explains tradeoffs, migration steps, and a recommended adapter-based implementation.

Why Pinecone (brief)
- Managed ANN with production-tuned algorithms (HNSW/IVF depending on tier) and turnkey scaling.
- Low-latency queries and predictable QoS for high-concurrency, high-QPS scenarios.
- Rich metadata filtering and namespace support for tenancy/isolation.
- Snapshot/export features for backups & DR.
- Minimal ops (no index tuning, vacuuming, or manual sharding).
- Better support and SLAs for production workloads.

Why pgvector (Supabase/Postgres) is attractive
- Minimal incremental cost when you already run Supabase/Postgres.
- Simpler stack: relational + vector storage in one place.
- Easier local development and CI (no external vector provider).
- Transactional integrity between chunks and vector metadata.
- Good for Phase 1 if you must keep monthly spend as low as possible.

Tradeoffs (summary)
- Pinecone: higher monthly cost, lower ops overhead, predictable performance.
- pgvector: lower cost at small scale, but more ops, more tuning for performance, potential complexity when scaling.
- Real-world result: Pinecone reduces engineering time and surprises; pgvector reduces immediate spend.

Recommendation for this project (given your constraints)
- You indicated: Vercel + Supabase preference, budget-conscious (< $1k/mo), and need to hit an ICP JSON milestone fast.
- Two viable approaches:
  1) Pinecone-first: if you prefer the least operational risk and want predictable retrieval. Choose Pinecone if you can accommodate its starter cost and want to iterate on prompts & product faster.
  2) pgvector-first: if sticking strictly under cost constraints for Phase 1 is essential. Implement quickly using your existing Supabase Postgres and pgvector, then migrate later to Pinecone as traffic and budget permit.
- Practical choice: Start with pgvector if monthly budget is the overriding constraint; otherwise, use Pinecone to minimize ops friction. In either case, implement the adapter pattern (next section) so switching is a config change.

Adapter pattern to keep both options swappable
- Implement a thin vector-store adapter interface in code:
  - upsertVectors(chunks: Chunk[]): Promise
  - queryVectors(queryEmbedding, topK, filters): Promise<SearchResult[]>
  - deleteVectors(ids: string[]): Promise
- Implement two concrete adapters:
  - PineconeAdapter (uses Pinecone SDK)
  - PgvectorAdapter (SQL queries + pgvector operations)
- Configure provider via ENV: e.g., `VECTOR_PROVIDER=pinecone|pgvector`
- Keep canonical chunk & source metadata in Postgres so the adapter only manages embeddings/queries.

Migration plan (pgvector → Pinecone)
1. Keep canonical chunk metadata in Postgres (see [`docs/archDecisions/data-storage.md:1`](docs/archDecisions/data-storage.md:1)). Always create stable `chunk_id` and `chunk_hash`.
2. Dedupe by `chunk_hash` before embedding; this avoids duplicate embeddings across providers.
3. Migration script:
   - Iterate chunks (by batch) and fetch or compute embeddings.
   - Upsert vectors into Pinecone with metadata: {chunk_id, source_id, domain, language, created_at}.
   - Validate parity: run a test suite of representative queries and compare top-K results from pgvector vs Pinecone.
4. Flip adapter (configuration) to point to Pinecone.
5. Monitor and, when confident, mark pgvector index as read-only or purge vectors to save space.

Implementation & parity considerations
- Use the same embedding model and same normalization for both providers; differences in embedding model or normalization will make results incomparable.
- Use the same similarity metric (cosine/dot) across providers.
- For pgvector, use ivfflat index with appropriate `lists` and tune `probe`/`search_k` for recall/perf tradeoffs.
- For Pinecone, choose a pod size appropriate to index size and QPS; start small and scale.

Operational differences & runbook notes
- pgvector requires DB maintenance (VACUUM/ANALYZE), backup carefulness for large vector columns, and attention to storage growth (vectors are stored in Postgres).
- Pinecone provides snapshot/export capabilities; schedule regular exports to object storage for additional DR.
- Pinecone: simpler scale-up by changing pod/plan (fast).
- pgvector: scaling beyond single-host Postgres often requires sharding or using read replicas and careful index distribution.

Cost & timeline impact (practical)
- pgvector reduces monthly infrastructure costs for Phase 1, making the 30-day JSON milestone cheap to run.
- Pinecone increases monthly costs but reduces engineering time and uncertainty — helpful if you want to iterate fast and avoid retrieval surprises.
- With your accelerated roadmap (30-day JSON goal), pgvector-first is defensible if you accept the extra ops risk; otherwise, Pinecone gives quicker confidence in retrieval quality.

Query examples & references
- pgvector sample (see [`docs/archDecisions/data-storage.md:1`](docs/archDecisions/data-storage.md:1)) — SQL snippet pattern using pgvector ivfflat index.
- Pinecone: use SDK upsert/query calls and metadata filters; keep metadata consistent with Postgres rows.

Key actionables (pick one)
- Option A (cost-first): Implement `pgvectorAdapter` and ship Phase 1 JSON pipeline on Supabase. Add `pineconeAdapter` and migration scripts for later.
- Option B (low-ops-first): Provision Pinecone at dev/stage/prod and implement `pineconeAdapter` first. Use pgvector as local dev fallback.
- Either way: implement adapter, preserve chunk metadata in Postgres, and add a migration script.

Where I updated architecture docs
- Current architecture doc choice: [`docs/archDecisions/architecture.md:15`](docs/archDecisions/architecture.md:15)
- Storage/schema reference: [`docs/archDecisions/data-storage.md:1`](docs/archDecisions/data-storage.md:1)

Next steps I can take (pick any)
- Scaffold the vector adapter interface and both implementations: [`src/services/vector-adapter.ts:1`](src/services/vector-adapter.ts:1)
- Provide a migration script template to move from pgvector → Pinecone
- Add a small local dev instruction (docker-compose) for pgvector testing

Owner: Roo  
Last updated: 2025-10-12