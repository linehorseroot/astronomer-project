# AstroFlow — Redis Architecture Choice & Rationale

**Last updated:** 2026-06-21 · **Status:** Design decision document

---

## Executive Summary

AstroFlow uses **Redis with PersistentVolume backing** (not PostgreSQL) as the primary authoritative state store. This decision prioritizes **sub-millisecond latency**, **schema flexibility**, and **Kubernetes-native deployment** over relational semantics and complex queries.

**Bottom line:** For a real-time workflow orchestration platform, Redis's speed and simplicity outweigh PostgreSQL's relational features.

---

## 1. Problem Statement

Traditional workflow orchestrators (Airflow, Prefect) store state in PostgreSQL. This works, but creates bottlenecks:

1. **Latency:** Dashboard queries take 50-200ms (network + disk + query planning)
2. **Schema friction:** Adding new fields requires migrations (downtime risk)
3. **Complexity:** Joins across workflows/runs/tasks require careful indexing
4. **Operational overhead:** Connection pooling, replication setup, backups

**AstroFlow requirement:** Live dashboard updates (live graph) demand sub-10ms latency for UI responsiveness.

---

## 2. Redis vs PostgreSQL: Detailed Comparison

### Latency

**PostgreSQL:**
- Network roundtrip: 1-2ms
- Query parsing & planning: 5-10ms
- Disk I/O (cache miss): 10-50ms
- Result serialization: 1-2ms
- **Total: 17-65ms per query**

**Redis:**
- Network roundtrip: 0.5-1ms (same namespace)
- In-memory lookup: 0.01-0.1ms
- Result serialization: 0.1-0.5ms
- **Total: 0.6-1.6ms per query**

**Winner:** Redis is **40-100x faster**.

### Schema Flexibility

**PostgreSQL:**
- All schema changes require migrations
- Migration must run on all replicas
- Risk: downtime during migration
- Example: Adding `escalation_level` to approvals table requires:
  ```sql
  ALTER TABLE approvals ADD COLUMN escalation_level INT DEFAULT 0;
  -- Blocks table for minutes if table is large
  ```

**Redis:**
- Data is JSON; new fields are optional
- No schema version enforcement
- Old clients ignore new fields (forward compatible)
- Example: Add `escalation_level` to approval JSON:
  ```json
  // Old approval object
  {"decision": "approved", "decided_by": "alice"}
  
  // New approval object (same key)
  {"decision": "approved", "decided_by": "alice", "escalation_level": 1}
  // No update needed; old clients work fine
  ```

**Winner:** Redis has zero migration cost.

### Operational Complexity

| Aspect | PostgreSQL | Redis |
|---|---|---|
| **Setup** | Install, configure, initialize DB | Helm chart, PVC, done |
| **Backup** | WAL archival, pg_dump, PITR | RDB snapshot + AOF, simple |
| **Replication** | Streaming replication, replication slots | Simple primary-replica, Sentinel |
| **Failover** | Manual or Patroni orchestrator | Sentinel auto-promotes |
| **Monitoring** | Connection pools, slow query logs | Memory, latency, replication lag |
| **Scaling** | Read replicas, sharding complex | Cluster (future) or Redis Stack |

**Winner:** Redis is simpler to operate on Kubernetes.

### Data Model Fit

**PostgreSQL excels at:**
- Complex transactions (ACID guarantees)
- Joins across multiple tables
- Aggregate queries (GROUP BY, HAVING)
- Full-text search

**AstroFlow needs:**
- Simple lookups: `GET run:{execution_id}`
- Time-range queries: `ZRANGE run:list 0 {now()} BYSCORE`
- Bulk updates: `SET approval:{id} {...}`
- Pub/Sub: `PUBLISH run:updates {...}`

**Redis excels at all of these.** No complex joins needed.

### Memory vs Disk Trade-Off

**PostgreSQL:**
- Data on disk, working set in cache
- Cache misses cause I/O stalls
- Works well when data >> RAM

**Redis:**
- All data in RAM, persisted to disk
- Requires sufficient RAM
- Works well when data ≤ RAM

**AstroFlow data volume:**
- Single tenant (acme-corp): ~50 workflows, ~1000 runs/day
- ~100 tasks per run → 100K task instances/day
- 6 months of hot data: ~18M task instances
- Estimated RAM: 10-50 GB (per tenant) → manageable on modern infrastructure

**Winner:** Redis is right-sized for AstroFlow's scale.

---

## 3. Decision Matrix

| Criterion | Weight | PostgreSQL | Redis | Winner |
|---|---|---|---|---|
| **Latency** | 30% | 3/10 | 10/10 | ✅ Redis |
| **Schema flexibility** | 25% | 5/10 | 10/10 | ✅ Redis |
| **Operational simplicity** | 20% | 4/10 | 9/10 | ✅ Redis |
| **Query complexity** | 15% | 10/10 | 4/10 | PostgreSQL |
| **Cost** | 10% | 6/10 | 8/10 | ✅ Redis |
| **TOTAL** | 100% | 5.6/10 | 8.8/10 | ✅ **Redis** |

---

## 4. Architecture Implications

### What Redis Enables

1. **Live dashboard:** Sub-10ms graph updates via WebSocket
2. **Real-time approvals:** Users see requests instantly, decisions are immediate
3. **Fast file sensor polling:** "File appeared" events propagate in < 100ms
4. **No connection pooling:** Kubernetes service handles distribution
5. **Schemaless evolution:** Add operator types without migrations

### What Redis Requires

1. **Memory planning:** Estimate data size, provision PV accordingly
2. **Denormalization:** No JOINs; duplicate data for read-heavy queries (acceptable trade-off)
3. **Eventual consistency:** Replica may lag primary by 100-500ms (acceptable for workflows)
4. **TTL cleanup:** Explicit key expiration for ephemeral data
5. **Archival strategy:** Move old runs to S3 after 2 years (not forgotten, just cold)

### Failure Modes

**PostgreSQL failure:**
- Primary down → failover takes 5-30 minutes (manual or automated)
- Disk full → immediate stop (no queries)
- Slow query → locks table, cascades to all queries

**Redis failure:**
- Primary down → Sentinel promotes replica in 10-20 seconds
- Memory full → fail gracefully (noeviction policy) or evict (configurable)
- Slow operation → fast failure (in-memory, no contention)

**Winner:** Redis is more resilient to operational failures.

---

## 5. Comparison Table: Feature Parity

| Feature | PostgreSQL | Redis | AstroFlow Need |
|---|---|---|---|
| ACID transactions | ✅ | ⚠️ (Lua scripts) | ✓ (per-key atomicity enough) |
| Relational joins | ✅ | ❌ | ✗ (denormalize instead) |
| Full-text search | ✅ | ⚠️ (search module) | ✗ (metadata search via Redis Sets) |
| TTL / auto-expiration | ❌ | ✅ | ✓ (event dedup, locks) |
| Pub/Sub | ❌ | ✅ | ✓ (WebSocket subscriptions) |
| Sorted sets (range queries) | ❌ (need index) | ✅ | ✓ (time-range queries) |
| HyperLogLog (cardinality) | ❌ | ✅ | ✗ (not needed now) |
| Geospatial | ❌ | ✅ | ✗ (not needed) |
| Persistence (RDB + AOF) | ✅ (WAL) | ✅ | ✓ (durability) |
| Replication | ✅ | ✅ | ✓ (HA) |
| Latency | 50-200ms | 1-5ms | ✓ (critical) |
| Memory usage | Lower (disk-based) | Higher (RAM) | ✗ (acceptable) |

---

## 6. Migration Path (If Needed)

**Scenario:** AstroFlow grows to 10,000 tenants, Redis memory usage exceeds 1 TB.

**Options:**

1. **Redis Cluster:** Shard by tenant_id, distribute across cluster nodes
   - Each shard: 100-200 GB
   - No data loss, transparent failover
   - Cost: ✅ (no new cloud resources)

2. **Hybrid (Hot/Cold):** 
   - Hot runs (< 6 months): Redis
   - Warm runs (6-24 months): Redis Stack Search (queryable)
   - Cold runs (> 24 months): S3 Parquet (archived)
   - Cost: ✅ (cheaper for archive)

3. **Dual-write (if absolutely necessary):**
   - Write to Redis (fast) + PostgreSQL (durable)
   - Read from Redis (fast path)
   - Fallback to PostgreSQL (consistency path)
   - Cost: ✗ (expensive, maintains two systems)

**Recommendation:** Don't start with dual-write. Use Redis Cluster when single instance hits limits (v2.0+).

---

## 7. Risk Mitigation

### Risk: Memory Exhaustion

**Mitigation:**
- Monitor memory usage daily
- Set maxmemory policy = `noeviction` (fail fast, don't silently lose data)
- Archive runs older than 2 years automatically
- Alert when memory > 70%

### Risk: Data Loss (Crash)

**Mitigation:**
- Enable RDB + AOF
- RDB snapshot every 60 seconds (bgsave)
- AOF fsync after every write (configurable)
- Daily backups via cloud provider snapshot

### Risk: Replication Lag

**Mitigation:**
- Use Sentinel with fast failover (10-20 seconds)
- Monitor replication lag (target: < 100ms)
- Acceptable for audit logs (eventual consistency OK)
- Critical for run status (mitigated by Kafka events)

### Risk: Schema Mismatch

**Mitigation:**
- Version JSON schema: `{"version": 1, "data": {...}}`
- Migration code: convert old format to new on read
- Forward compatible: new clients ignore unknown fields
- Backward compatible: old clients ignore new fields

---

## 8. Kubernetes Deployment Checklist

- [x] StatefulSet (2 replicas: primary + replica)
- [x] PersistentVolumeClaim (100 GB, fast storage class)
- [x] Service (headless, internal to namespace)
- [x] ConfigMap (redis.conf with RDB + AOF settings)
- [x] Secret (Redis password)
- [x] Redis Sentinel (auto-failover)
- [x] Monitoring (memory, latency, replication lag)
- [x] Backup automation (daily snapshots)
- [x] Archival script (move runs > 2 years to S3)

---

## 9. Comparison to Competitors

### Airflow (PostgreSQL)

Airflow uses PostgreSQL for:
- DAG metadata
- Task instances (status, logs)
- Connections, variables

**Why AstroFlow is different:**
- Airflow's PostgreSQL queries are slow (users accept 1-2 second dashboard updates)
- AstroFlow demands live updates (sub-100ms)
- Airflow rarely queries historical data; AstroFlow keeps it hot (approval audit trail)

### Prefect (PostgreSQL + S3)

Prefect uses:
- PostgreSQL for flow runs, task runs
- S3 for logs, results

**Why AstroFlow diverges:**
- Prefect has similar latency issues with PostgreSQL
- AstroFlow treats all state as equally important (no separate hot/cold tiers in core)
- Redis Pub/Sub enables real-time subscriptions (Prefect uses REST polling)

### Temporal (Custom DB)

Temporal built a custom database for workflow state. AstroFlow chose Redis instead because:
- Temporal's custom DB has high complexity (not suitable for early-stage platform)
- Redis is battle-tested, widely understood
- Redis cluster provides scalability without custom code

---

## 10. Decision Record

**Decision:** Use Redis (with PV backing) as the authoritative state store.

**Date:** 2026-06-21

**Drivers:**
- Latency: sub-10ms required for live graph
- Simplicity: zero schema migrations
- Kubernetes: native StatefulSet deployment
- Cost: no managed service required

**Alternatives considered & rejected:**
- PostgreSQL: too slow for live updates
- DynamoDB: vendor lock-in, cost at scale
- MongoDB: overkill for simple data model
- Dual-write (Redis + PostgreSQL): maintenance burden

**Reversibility:** Medium (would require data export + re-import to PostgreSQL)

**Next review:** When single Redis instance exceeds 500 GB memory (v2.0+)

---

## 11. Monitoring Checklist

### Daily Alerts
- [ ] Memory usage > 80%
- [ ] Replication lag > 500ms
- [ ] Command latency p99 > 50ms
- [ ] Connection count > 1000

### Weekly Reviews
- [ ] Data growth rate (GB/week)
- [ ] RDB save time (should be < 10 seconds)
- [ ] AOF size (should not exceed 10x RDB size)

### Monthly Actions
- [ ] Restore-from-backup drill
- [ ] Archival of old runs (> 2 years)
- [ ] Capacity planning review

---

## 12. Conclusion

Redis is the **right choice** for AstroFlow because:

1. ✅ **Speed:** 40-100x faster than PostgreSQL for AstroFlow's use cases
2. ✅ **Simplicity:** No migrations, no connection pooling, no replication slots
3. ✅ **Kubernetes-native:** StatefulSet, PVC, Sentinel — all built-in
4. ✅ **Scalability:** From single instance (v1.0) to cluster (v2.0+)
5. ✅ **Cost:** No managed database service required

**Trade-offs are acceptable:**
- ⚠️ Memory > disk (mitigated by archival strategy)
- ⚠️ No complex queries (mitigated by denormalization)
- ⚠️ Eventually consistent (acceptable for audit logs)

This decision enables AstroFlow to deliver a **fast, responsive, user-friendly workflow platform** without operational complexity.

