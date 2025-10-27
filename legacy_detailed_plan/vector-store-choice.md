# Vector store choice — Supabase pgvector (MVP Primary) vs. Pinecone (Future Scaling Option)

Summary
For MVP Phase 1, Supabase Postgres with the `pgvector` extension has been chosen as the primary vector store. This decision prioritizes simplicity, cost-efficiency, and seamless integration within the Supabase ecosystem, reducing operational overhead and total cost of ownership. Pinecone, while a robust managed solution, is considered a future alternative for scaling beyond MVP needs. This document details the rationale, implementation, and potential migration path.

Why pgvector (Supabase/Postgres) is chosen for MVP
- **Minimal incremental cost:** Utilizes the existing Supabase Postgres instance, significantly reducing infrastructure costs for MVP.
- **Simpler stack:** Consolidates relational data and vector storage in one managed service, simplifying development, deployment, and maintenance.
- **Easier local development and CI:** No external vector provider required during development and testing.
- **Transactional integrity:** Ensures strong consistency between your relational data and vector metadata.
- **Tight integration within Supabase:** Leverages Supabase's managed Postgres capabilities, RLS, and backup features for the entire data set.
- **Sufficient for MVP:** Supports the initial scale and performance requirements for Phase 1.

Why Pinecone (future option)
- Managed ANN with production-tuned algorithms (HNSW/IVF) and turnkey scaling.
- Low-latency queries and predictable QoS for very high-concurrency, high-QPS scenarios.
- Rich metadata filtering and namespace support for tenancy/isolation at enterprise scale.
- Minimal ops (no index tuning, vacuuming, or manual sharding for large scale).
- Better support and SLAs for demanding production workloads in later phases.

Tradeoffs (summary)
- **pgvector:** Lower cost, simpler ops for MVP, unified data layer. Requires manual scaling considerations (indexing, tuning) for very high volumes.
- **Pinecone:** Higher monthly cost, but offers superior performance and enterprise features for extreme scale. Adds an external dependency.

Recommendation for this project (given current constraints)
- **Primary for MVP:** Supabase Postgres with `pgvector` is the default choice for MVP Phase 1 due to the clear focus on cost-effectiveness, simplicity, and maximizing the Supabase ecosystem.
- **Future Scaling:** Pinecone remains a viable option for Phase 2 and beyond, if the application scales to a point where `pgvector` performance or operational complexity becomes a bottleneck.

Adapter pattern for future flexibility
- The existing vector-store adapter interface design remains crucial to preserve the option for future migration.
  - `upsertVectors(chunks: Chunk[]): Promise`
  - `queryVectors(queryEmbedding, topK, filters): Promise<SearchResult[]>`
  - `deleteVectors(ids: string[]): Promise`
- The `PgvectorAdapter` (SQL queries + pgvector operations) will be the initial concrete implementation.
- A `PineconeAdapter` can be developed and integrated later if migration is required, with configuration via ENV variables (e.g., `VECTOR_PROVIDER=pgvector|pinecone`).
- Canonical chunk & source metadata will always be kept in Supabase Postgres, with `pgvector` storing the embeddings directly.

Migration plan (pgvector → Pinecone, if needed)
1.  **Canonical chunk metadata in Postgres:** Continue storing all chunk and source data in Supabase Postgres (see [`docs/archDecisions/data-storage.md:1`](docs/archDecisions/data-storage.md:1)). Ensure stable `chunk_id` and `chunk_hash`.
2.  **Dedupe by `chunk_hash`:** Continue to deduplicate by `chunk_hash` before embedding to avoid duplicate embeddings across any vector store.
3.  **Migration script:** If a migration to Pinecone becomes necessary, a script will:
    -   Iterate through existing chunks (by batch) and fetch their embeddings (or recompute if necessary).
    -   Upsert these vectors into Pinecone with relevant metadata: `{chunk_id, source_id, domain, language, created_at}`.
    -   Validate parity: Run a test suite of representative queries and compare top-K results from `pgvector` vs Pinecone to ensure consistency.
4.  **Flip adapter:** Update the `VECTOR_PROVIDER` environment variable to point to the `PineconeAdapter`.
5.  **Monitor:** Closely monitor the new Pinecone-based system. Once confident, the `pgvector` index can be marked as read-only or purged to save space within Postgres.

Implementation & parity considerations
- Use the same embedding model and normalization across all providers to ensure comparable results.
- Use the same similarity metric (cosine) for consistency.
- For `pgvector`, optimize with `ivfflat` indexing, and tune `lists` and `probe`/`search_k` parameters for recall/performance tradeoffs as needed.

Operational differences & runbook notes
- **pgvector:** Requires attention to Postgres database maintenance (VACUUM/ANALYZE), backup strategies for large vector columns, and storage growth management within Postgres. Scaling beyond single-host Postgres for vector operations might require manual sharding or more advanced Postgres setups.
- **Pinecone:** Provides strong managed service features, simplifying scaling (changing pod/plan) and operational aspects. Offers built-in snapshot/export capabilities.

Cost & timeline impact (practical)
- `pgvector` significantly reduces monthly infrastructure costs for Phase 1, making the MVP cheap to run.
- Choosing `pgvector` for MVP aligns with an accelerated roadmap focused on getting the JSON generation milestone delivered cost-effectively.

Query examples & references
- `pgvector` sample (see [`docs/archDecisions/data-storage.md`](docs/archDecisions/data-storage.md:218)) — SQL snippet pattern using `pgvector` `ivfflat` index.

Key actionables for MVP Phase 1
- Implement `PgvectorAdapter` and ship the Phase 1 JSON pipeline on Supabase.
- Ensure the vector adapter interface is well-defined to allow for a `PineconeAdapter` in the future.
- Provide clear local development instructions for `pgvector` testing.

Owner: Roo (architect)
Last updated: 2025-10-25