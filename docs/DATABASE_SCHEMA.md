# AstroFlow — Database Schema Design

**Last updated:** 2026-06-21 · **Status:** Design for v1 · **Primary DB:** Redis (RDB + AOF, PV-backed) · **Container Storage:** PersistentVolume on Kubernetes

---

## 1. Overview

AstroFlow's backend uses **Redis** as the authoritative state store, backed by persistent volumes on Kubernetes. Redis RDB snapshots and AOF (Append-Only File) ensure durability across pod restarts.

### Redis Data Hierarchy
The Controller and Execution Engine own:
- **Workflows:** DAG metadata, versioning, ownership
- **Runs:** Execution instances (execution_id, dag_execution_id, status, start/end times)
- **TaskInstances:** Per-task execution state (task_id, status, attempts, logs)
- **Approvals:** Manual intervention & approval gate requests (who, when, decision)
- **AuditLog:** All state changes (compliance, debugging, analytics)
- **Executions:** execution_id → dag_execution_id mapping (Controller's correlation table)
- **Schedules:** Recurring workflow definitions (cron, parameters, enabled/disabled)
- **Secrets:** Encrypted credential storage (http_conn_id, kafka_conn_id references)
- **TaskTemplates:** Governed operator catalog (schema, version, documentation)

### Redis Persistence Strategy
- **RDB (Redis Database file):** Snapshot every 60 seconds (or after 10K writes). Backs up to PV.
- **AOF (Append-Only File):** fsync after every write. Ensures no data loss even if pod crashes.
- **PersistentVolume:** Backed by cloud block storage (e.g., AWS EBS, GCP Persistent Disk, Azure Managed Disk).
- **Replication:** Redis Sentinel or Redis Cluster for HA. Primary replica pair on separate nodes.

---

## 2. Redis Data Structures

All data is stored as Redis strings (JSON-serialized) with hierarchical keys and TTLs.

### 2.1 Workflows

**Key pattern:** `workflow:{tenant_id}:{workflow_id}`  
**Type:** String (JSON)  
**TTL:** None (persisted indefinitely)

```json
{
  "workflow_id": "orders_etl",
  "tenant_id": "acme-corp",
  "name": "Orders Daily ETL",
  "description": "Extract, transform, and load orders.",
  "owner_id": "alice@acme.com",
  "team_id": "data-eng",
  
  "dag_spec": {
    "version": 1,
    "nodes": [
      {"id": "file_sensor", "type": "FileSensorOperator", "params": {...}},
      {"id": "transform", "type": "PythonOperator", "params": {...}},
      {"id": "approval", "type": "ApprovalGateOperator", "params": {...}}
    ],
    "edges": [
      {"from": "file_sensor", "to": "transform"},
      {"from": "transform", "to": "approval"}
    ]
  },
  
  "airflow_dag_id": "orders_etl",
  "enabled": true,
  "version": 1,
  
  "created_at": "2026-06-20T10:00:00Z",
  "updated_at": "2026-06-20T10:00:00Z",
  "created_by": "alice@acme.com",
  "deleted_at": null
}
```

**Index keys (for listing):**
- `workflow:tenant:{tenant_id}:list` (sorted set by created_at)
- `workflow:tenant:{tenant_id}:owner:{owner_id}:list` (sorted set)
- `workflow:search:{tenant_id}:{name}` (for full-text search, store set of workflow IDs)

---

### 2.2 Runs (Executions)

**Key pattern:** `run:{execution_id}`  
**Type:** String (JSON)  
**TTL:** None (persisted indefinitely; archived after 2 years)

```json
{
  "execution_id": "exec_20260621_orders_etl_1",
  "dag_execution_id": "orders_etl_20260621T060000_abcd1234",
  
  "workflow_id": "orders_etl",
  "tenant_id": "acme-corp",
  
  "run_type": "scheduled",
  
  "scheduled_at": "2026-06-21T06:00:00Z",
  "started_at": "2026-06-21T06:00:30Z",
  "ended_at": "2026-06-21T06:15:45Z",
  
  "status": "success",
  
  "try_number": 1,
  "max_tries": 1,
  
  "parameters": {
    "date": "2026-06-21",
    "batch_size": 1000
  },
  
  "triggered_by": "scheduler",
  
  "sla_miss": false,
  "sla_miss_at": null,
  
  "created_at": "2026-06-21T06:00:00Z",
  "updated_at": "2026-06-21T06:15:45Z"
}
```

**Index keys:**
- `run:tenant:{tenant_id}:list` (sorted set by created_at, for dashboard)
- `run:workflow:{workflow_id}:list` (sorted set by created_at, for run history)
- `run:status:{status}:list` (sorted set, for filtering)

---

### 2.3 TaskInstances

**Key pattern:** `task:{execution_id}:{task_id}:{try_number}`  
**Type:** String (JSON)  
**TTL:** None (persisted)

```json
{
  "execution_id": "exec_20260621_orders_etl_1",
  "task_id": "file_sensor",
  "try_number": 1,
  
  "status": "success",
  
  "queued_at": "2026-06-21T06:00:30Z",
  "started_at": "2026-06-21T06:00:45Z",
  "ended_at": "2026-06-21T06:05:30Z",
  "duration_seconds": 285,
  
  "result": {
    "file_path": "/data/orders_2026-06-21.parquet",
    "size_bytes": 1048576
  },
  
  "error_message": null,
  "operator_type": "FileSensorOperator",
  
  "sla_miss": false,
  "sla_miss_at": null,
  
  "created_at": "2026-06-21T06:00:30Z",
  "updated_at": "2026-06-21T06:05:30Z"
}
```

**Index keys:**
- `task:execution:{execution_id}:list` (set, for quick lookups by execution_id)
- `task:status:{status}:list` (sorted set by updated_at, for filtering)

---

### 2.4 Approvals

**Key pattern:** `approval:{execution_id}:{task_id}`  
**Type:** String (JSON)  
**TTL:** None (persisted; cleaned up 7 days after decision)

```json
{
  "execution_id": "exec_20260621_orders_etl_1",
  "task_id": "qa_approval",
  
  "approval_type": "approval_gate",
  "description": "QA team reviews transformed data. Approve to proceed to production.",
  
  "approvers_roles": ["qa_team", "data_eng_lead"],
  "cc_roles": ["manager"],
  
  "requested_at": "2026-06-21T06:10:00Z",
  "timeout_seconds": 3600,
  "timeout_at": "2026-06-21T07:10:00Z",
  "escalate_after_seconds": 900,
  "escalate_at": "2026-06-21T06:25:00Z",
  "escalate_to_role": "data_director",
  
  "decided": true,
  "decision": "approved",
  "decided_by": "bob@acme.com",
  "decided_at": "2026-06-21T06:20:15Z",
  "decision_notes": "Data looks good, ready for prod.",
  
  "escalation_level": 0,
  "escalated_to_user": null,
  
  "user_input": {
    "qa_sign_off": "Bob Jones",
    "validated_records": 1000,
    "anomalies": 0
  },
  
  "created_at": "2026-06-21T06:10:00Z",
  "updated_at": "2026-06-21T06:20:15Z"
}
```

**Index keys:**
- `approval:pending:list` (sorted set by timeout_at, for timeout polling)
- `approval:escalate:list` (sorted set by escalate_at)

---

### 2.5 AuditLog

**Key pattern:** `audit:{timestamp}:{event_id}`  
**Type:** String (JSON)  
**TTL:** None (persisted; archived after 2 years)

```json
{
  "event_id": "evt_abc123def456",
  "event_type": "approval_decided",
  "tenant_id": "acme-corp",
  
  "subject_type": "approval",
  "subject_id": "exec_20260621_orders_etl_1:qa_approval",
  
  "changes": {
    "decision": "approved",
    "decided_by": "bob@acme.com",
    "decision_notes": "Data looks good"
  },
  
  "actor_id": "bob@acme.com",
  "actor_type": "user",
  
  "execution_id": "exec_20260621_orders_etl_1",
  
  "source": "ui",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  
  "created_at": "2026-06-21T06:20:15Z"
}
```

**Index keys:**
- `audit:tenant:{tenant_id}:list` (sorted set by created_at, for compliance export)
- `audit:event_type:{event_type}:list` (sorted set, for filtering)
- `audit:subject:{subject_type}:{subject_id}:list` (sorted set)

---

### 2.6 Executions (ID Mapping)

**Key pattern:** `exec:mapping:{execution_id}`  
**Type:** String (JSON)  
**TTL:** None (persisted)

Maps execution_id (Controller-minted, business-level) to dag_execution_id (Airflow's internal run_id).

```json
{
  "execution_id": "exec_20260621_orders_etl_1",
  "dag_execution_id": "orders_etl_20260621T060000_abcd1234",
  
  "workflow_id": "orders_etl",
  "tenant_id": "acme-corp",
  
  "airflow_dag_id": "orders_etl",
  
  "created_at": "2026-06-21T06:00:00Z"
}
```

**Reverse lookup key:** `exec:by_dag:{dag_execution_id}` → `{execution_id}` (simple string)

**Query patterns:**
```
// UI subscribes to execution_id, needs to find Airflow run
GET exec:mapping:{execution_id} → dag_execution_id

// Controller receives dag_execution_id from Airflow, needs to route events by execution_id
GET exec:by_dag:{dag_execution_id} → execution_id
```

---

### 2.7 Schedules

**Key pattern:** `schedule:{workflow_id}:{schedule_name}`  
**Type:** String (JSON)  
**TTL:** None (persisted)

```json
{
  "workflow_id": "orders_etl",
  "tenant_id": "acme-corp",
  "schedule_name": "daily_6am",
  
  "recurrence_type": "cron",
  "cron_expression": "0 6 * * *",
  "interval_seconds": null,
  "start_date": "2026-01-01",
  "end_date": null,
  
  "timezone": "America/New_York",
  
  "default_params": {
    "batch_size": 1000,
    "retry_count": 3
  },
  
  "enabled": true,
  
  "created_at": "2026-06-15T10:00:00Z",
  "updated_at": "2026-06-15T10:00:00Z",
  "created_by": "alice@acme.com"
}
```

**Index keys:**
- `schedule:enabled:list` (sorted set, for scheduler polling)

---

### 2.8 Secrets

**Key pattern:** `secret:{tenant_id}:{secret_key}`  
**Type:** String (encrypted JSON)  
**TTL:** None (persisted; encrypted at rest using KMS)

```json
{
  "secret_key": "ml_service",
  "tenant_id": "acme-corp",
  "secret_type": "http_conn",
  
  "encrypted_value": "<base64-encrypted-credentials>",
  "encryption_key_id": "kms-key-v2",
  
  "description": "ML inference service credentials",
  
  "metadata": {
    "host": "ml-api.acme.com",
    "port": 443,
    "scheme": "https"
  },
  
  "accessible_by_roles": ["data_eng", "ml_engineers"],
  
  "created_at": "2026-06-15T10:00:00Z",
  "updated_at": "2026-06-15T10:00:00Z",
  "created_by": "alice@acme.com",
  "accessed_at": "2026-06-21T06:00:00Z"
}
```

**Encryption:** AES-256 GCM with envelope encryption (data key encrypted by KMS master key). Decryption happens server-side only when Execution Engine needs to make an HTTP or Kafka call.

**Index keys:**
- `secret:{tenant_id}:list` (set, for listing secrets per tenant)

---

### 2.9 TaskTemplates

**Key pattern:** `template:{tenant_id}:{template_key}:v{version}`  
**Type:** String (JSON)  
**TTL:** None (persisted; versioned)

Tenant_id = null for system-wide templates; otherwise tenant-specific.

```json
{
  "template_key": "file_sensor",
  "tenant_id": null,
  "version": 1,
  
  "display_name": "File Sensor",
  "description": "Wait for a file to appear on disk or cloud storage.",
  
  "operator_class": "FileSensorOperator",
  
  "param_schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["filepath"],
    "properties": {
      "filepath": {"type": "string", "description": "Path to file (supports templating)"},
      "poke_interval": {"type": "integer", "default": 60},
      "timeout_seconds": {"type": "integer", "default": 86400},
      "mode": {"type": "string", "enum": ["poke", "reschedule"], "default": "poke"}
    }
  },
  
  "documentation": {
    "description": "FileSensorOperator waits for a file to appear.",
    "examples": [
      {
        "name": "Wait for daily extract",
        "params": {
          "filepath": "/data/orders_{{ ds }}.parquet",
          "poke_interval": 60,
          "timeout_seconds": 86400
        }
      }
    ]
  },
  
  "status": "published",
  "approval_status": "approved",
  "approved_by": "alice@acme.com",
  "approved_at": "2026-06-15T10:00:00Z",
  
  "category": "sensors",
  "tags": ["file", "filesystem", "polling"],
  
  "created_at": "2026-06-15T10:00:00Z",
  "updated_at": "2026-06-15T10:00:00Z",
  "created_by": "system"
}
```

**Index keys:**
- `template:list` (sorted set, for catalog)
- `template:status:published:list` (set, for UI)
- `template:category:{category}:list` (set)

---

### 2.10 Tenants (Multi-Tenancy)

**Key pattern:** `tenant:{tenant_id}`  
**Type:** String (JSON)  
**TTL:** None (persisted)

```json
{
  "tenant_id": "acme-corp",
  "name": "Acme Corporation",
  
  "enabled": true,
  
  "settings": {
    "max_concurrent_runs": 10,
    "max_workflows": 100,
    "retention_days": 730,
    "audit_log_retention_days": 2555
  },
  
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

**Index keys:**
- `tenant:list` (set, for all tenants)

### 3.1 Event Deduplication

**Key:** `event_id:{sha256(event_payload)}`  
**Type:** String (presence key)  
**TTL:** 24 hours  
**Used by:** Execution Engine Kafka consumer (idempotent processing)

```
event_id:a1b2c3d4e5f6... → "seen"
```

Ensures that if Kafka re-delivers the same event (at-least-once semantics), we don't double-process it.

### 3.2 Distributed Locks

**Key:** `lock:workflow:{workflow_id}` or `lock:run:{execution_id}`  
**Type:** String (owner ID)  
**TTL:** 30 seconds (auto-expires if holder crashes)  
**Used by:** Deployment, run operations (prevent concurrent updates)

```
lock:run:exec_abc123 → "node_02:pid_1234"
```

### 3.3 Pagination & Index Keys

Redis Sorted Sets are used for efficient pagination and filtering:

```
// List all runs for a tenant, sorted by created_at (most recent first)
ZREVRANGE run:tenant:{tenant_id}:list 0 99

// Get runs with status = 'running'
ZRANGE run:status:running:list 0 99

// Get pending approvals (sorted by timeout_at)
ZRANGE approval:pending:list 0 99
```

---

## 4. Key Design Decisions

### 4.1 Redis as Primary Store

**Rationale:**
- Sub-millisecond latency for UI updates (live graph, approval cards)
- Simple JSON key-value model (no ORM, schema migration overhead)
- Built-in TTL for automatic expiration (e.g., cleanup of old audit logs)
- Pub/Sub for real-time event notifications (WebSocket to UI)
- Atomic operations (SET/GET/DEL) with transactions for consistency

**Trade-offs:**
- Memory-constrained (mitigated by PV archival after 2 years)
- No complex joins (handled in application layer)
- Eventual consistency (acceptable for audit logs, not for critical control flow)

### 4.2 Persistent Volume Backing

**Setup:**
- Redis deployed on Kubernetes with a StatefulSet
- PersistentVolumeClaim (PVC) mounted at `/data` (inside container)
- PV provisioner: cloud block storage (AWS EBS, GCP Persistent Disk, Azure Managed Disk)
- RDB snapshots: every 60 seconds or after 10K writes (configurable)
- AOF (Append-Only File): fsync after every write (durability guarantee)

**Restart behavior:**
- On pod restart, Redis loads RDB + replays AOF → full data recovery
- No data loss, even if pod crashes

### 4.3 execution_id vs dag_execution_id

**Problem:** Airflow's run IDs are opaque and ephemeral. The UI and external systems need a business-level correlation ID.

**Solution:** Controller mints `execution_id` (e.g., `exec_20260621_orders_1`) at run start. Stored in `exec:mapping:{execution_id}` key alongside Airflow's `dag_execution_id`. UI and Kafka events use `execution_id`; only Controller stores and uses `dag_execution_id`.

**Benefit:** UI stays decoupled from Airflow internals. execution_id is stable, human-readable, and travels across all components.

### 4.4 JSON Serialization

All values are JSON strings. Allows schema evolution without migrations. Parser libraries available in all languages (no coupling to Redis serialization format).

### 4.5 Soft Deletes

Workflows and other entities use `deleted_at` field (not physical deletion). Preserves historical data for compliance and debugging.

### 4.6 Secrets Encryption

All secrets encrypted at rest (envelope encryption: data encrypted with a key that's itself encrypted by KMS master key). Decryption happens server-side only when the Execution Engine needs to make an HTTP or Kafka call.

### 4.7 AuditLog for Compliance

Every state change logged with actor, timestamp, change details. Immutable. Used for compliance reviews, debugging, and analytics. Exported periodically to long-term storage (S3 Parquet) for compliance retention.

---

## 5. Performance Patterns

### High-Traffic Queries

**UI dashboard (runs for a tenant):**
```
ZREVRANGE run:tenant:{tenant_id}:list 0 99
// Returns list of run keys, then GET each run:{execution_id}
```
O(N+M) where N is sorted set size, M is runs to fetch.

**Live graph (tasks for a run):**
```
SMEMBERS task:execution:{execution_id}:list
// Returns all tasks in the run
```
O(N) where N is number of tasks.

**Approval timeout polling (every minute):**
```
ZRANGE approval:pending:list 0 {now()} BYSCORE
// Returns approvals with timeout_at <= now()
```
O(log(N) + M) where N is total approvals, M is expired ones.

### Optimization Strategy
- Use Redis Sorted Sets for time-range queries (timeout_at, created_at)
- Use Redis Sets for membership (tasks in a run, approvals pending)
- Denormalize read-heavy queries (e.g., cache run status in run:{execution_id}:status for quick dashboard queries)
- TTL keys for ephemeral data (event dedup, locks)

---

## 6. Data Model Versioning

### Schema Evolution
- JSON structure versioned inline: `{"version": 1, "data": {...}}`
- New fields are optional; old clients ignore unknown fields (forward compatible)
- Breaking changes: create new key pattern (e.g., `run_v2:{execution_id}` if incompatible)

### Backward Compatibility
- Old WorkflowSpecs remain valid; new operators are optional
- DAG specs stored as-is; compilation handles version translation
- Task results (XCom) are opaque to Redis (controller handles serialization)

---

## 7. Security & Compliance

### Data Protection
- Secrets encrypted at rest (AES-256 GCM with KMS key)
- Redis AUTH: strong password required
- Connections to Redis use TLS (redis-cli --tls)
- PersistentVolume encryption: cloud provider block storage encryption

### Access Control
- Row-level security enforced at application layer (all queries filtered by tenant_id)
- Approval decisions logged with actor_id and IP address
- Audit log immutable (append-only)
- PII minimized: only user IDs and emails stored (not phone, SSN, etc.)

### Compliance Export
- Audit log periodically exported to S3 (Parquet format) for long-term retention
- Retention policy: hot (Redis) 6 months, warm (S3) 1 year, cold (Glacier) 2 years
- Export format includes full audit trail, signatures for integrity

---

## 8. Scaling Considerations

### Redis Memory Management
- Monitor memory usage (target: 60–70% of allocated)
- Implement eviction policy: no eviction (fail on out-of-memory) to avoid silent data loss
- Archive old runs after 2 years to S3

### Redis Replication & HA
- Primary-Replica setup: master on one node, replica on another
- Redis Sentinel: monitors health, auto-fails over if primary dies
- Clients connect via Sentinel (not directly to primary)
- Persistence: RDB + AOF on PV ensures recovery

### Horizontal Scaling (future)
- Redis Cluster: sharding by tenant_id (each tenant's data on a specific shard)
- Cluster topology: 6 nodes (3 primary, 3 replica) for redundancy
- After v2: migrate to cluster if per-tenant data exceeds Redis memory limits

---

## 9. Relationship to Runtime Components

**Workflow Core (Airflow):**
- Reads: workflows (dag_spec), secrets, task_templates
- Writes: runs, task_instances, executions (after DAG registration)
- Storage: Redis (via Controller API)

**Controller:**
- Owns: runs (status), task_instances (status), approvals, audit_log, executions (mapping)
- Reads: secrets, task_templates
- Storage: Redis (primary), S3 (archival)

**Execution Engine:**
- Reads: secrets (for HTTP/Kafka calls)
- Emits events (via Kafka) → Controller consumes and updates Redis
- No direct database access (all via Kafka events)

**UI Console:**
- Reads: runs, task_instances, workflows, schedules, task_templates (all read-only)
- Writes: workflows (create/update/publish), schedules, approvals (decided)
- Storage: Redis (via Controller API)

---

## 10. Example Query Flows

### User Views Dashboard

```
// UI calls GET /api/runs?tenant=acme-corp&limit=20
// Controller executes:
ZREVRANGE run:tenant:acme-corp:list 0 19
// Returns: [exec_id1, exec_id2, ..., exec_id20]

// For each execution_id, fetch run details:
GET run:exec_id1
GET run:exec_id2
...

// UI receives: [{execution_id, status, started_at, ...}, ...]

// UI subscribes to live updates via WebSocket:
SUBSCRIBE run:updates:acme-corp
// (or similar channel for tenant-scoped events)

// When tasks complete or approvals change:
// Controller publishes: PUBLISH run:updates:acme-corp {execution_id, status}
// UI receives WebSocket message, re-renders graph
```

### QA Approves a Task

```
// UI calls POST /api/approvals/{execution_id}/{task_id}/decide
// Backend:

// 1. Read current state
GET approval:{execution_id}:{task_id}

// 2. Update approval
SET approval:{execution_id}:{task_id} {
  "decided": true,
  "decision": "approved",
  "decided_by": "bob@acme.com",
  "decided_at": "2026-06-21T06:20:15Z",
  "decision_notes": "Data looks good"
} EX 604800

// 3. Log audit event
SET audit:{timestamp}:{event_id} {
  "event_type": "approval_decided",
  "execution_id": ...,
  "changes": {...}
}
ZADD audit:tenant:acme-corp:list {timestamp} {event_id}

// 4. Publish event to Kafka (execution_id as partition key)
PUBLISH astroflow.approval.decided {
  "execution_id": "exec_20260621_orders_etl_1",
  "task_id": "qa_approval",
  "decision": "approved",
  "decided_by": "bob@acme.com"
}

// 5. Execution Engine consumes approval event
// → Marks task as success
// → Publishes task.success event

// 6. Controller consumes task.success event
// → Updates: SET task:exec_20260621_orders_etl_1:qa_approval:1 {status: 'success'}
// → Updates run status
// → Publishes: PUBLISH run:updates:acme-corp {execution_id, status}

// 7. UI receives WebSocket, updates live graph
```

### Scheduled Run Triggers

```
// Scheduler (Controller component) runs every minute:
ZRANGE schedule:enabled:list 0 {now()} BYSCORE
// Returns: [schedule_1, schedule_2, ...] with next_run_at <= now()

// For each schedule, create a new run:
execution_id = "exec_" + timestamp + "_" + workflow_id + "_" + random()
SET exec:mapping:{execution_id} {
  "dag_execution_id": null,  // Set after Airflow registers
  "workflow_id": "orders_etl",
  "tenant_id": "acme-corp",
  "created_at": "2026-06-21T06:00:00Z"
}

SET run:{execution_id} {
  "execution_id": execution_id,
  "workflow_id": "orders_etl",
  "tenant_id": "acme-corp",
  "status": "queued",
  "run_type": "scheduled",
  "scheduled_at": "2026-06-21T06:00:00Z",
  "triggered_by": "scheduler"
}

ZADD run:tenant:acme-corp:list {timestamp} {execution_id}
ZADD run:workflow:orders_etl:list {timestamp} {execution_id}

// Workflow Core (Airflow) pulls the run:
// → Reads workflow DAG spec
// → Compiles and registers DAG with Airflow
// → Airflow generates dag_execution_id
// → Controller updates: SET exec:mapping:{execution_id} {dag_execution_id: ...}
// → Execution proceeds via Kafka events
```

---

## 11. OpenShift Deployment (Controller Namespace)

Redis is deployed **co-located with the Controller** in the same OpenShift namespace for low-latency access and simplified networking.

### StatefulSet Configuration (OpenShift)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: astroflow-redis
  namespace: controller  # Same namespace as Controller pods
spec:
  serviceName: astroflow-redis
  replicas: 2  # Primary + Replica (Redis Sentinel manages failover)
  selector:
    matchLabels:
      app: astroflow-redis
      component: database
  template:
    metadata:
      labels:
        app: astroflow-redis
        component: database
    spec:
      # OpenShift: Run as non-root (SecurityContext requirement)
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      
      # Pod affinity: spread replicas across different nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - astroflow-redis
              topologyKey: kubernetes.io/hostname  # Different nodes
      
      containers:
      - name: redis
        image: redis:7.0-alpine  # Alpine for smaller footprint on OpenShift
        imagePullPolicy: IfNotPresent
        
        ports:
        - containerPort: 6379
          name: redis
          protocol: TCP
        
        volumeMounts:
        - name: data
          mountPath: /data
        - name: redis-config
          mountPath: /etc/redis
          readOnly: true
        
        command:
        - redis-server
        - /etc/redis/redis.conf
        
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2"
        
        # OpenShift probes
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
        
        # Security context for the container
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
          capabilities:
            drop:
            - ALL
      
      # ConfigMap for Redis configuration
      volumes:
      - name: redis-config
        configMap:
          name: astroflow-redis-config
  
  # PersistentVolumeClaim for data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast  # OpenShift storage class (e.g., fast, standard)
      resources:
        requests:
          storage: 100Gi  # Adjust based on tenant data volume
```

### ConfigMap (Redis Configuration)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: astroflow-redis-config
  namespace: controller
data:
  redis.conf: |
    port 6379
    requirepass ${REDIS_PASSWORD}
    maxmemory 3gb
    maxmemory-policy noeviction
    
    # RDB snapshots
    save 60 10000
    save 300 1000
    rdbcompression yes
    rdbchecksum yes
    dbfilename dump.rdb
    
    # AOF (Append-Only File)
    appendonly yes
    appendfsync everysec
    no-appendfsync-on-rewrite no
    
    # Replication
    slave-read-only yes
    slave-serve-stale-data yes
    repl-diskless-sync no
    
    # Networking
    bind 0.0.0.0
    protected-mode yes
    timeout 0
    tcp-backlog 511
    tcp-keepalive 300
```

### Service (Internal to Controller Namespace)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: astroflow-redis
  namespace: controller
  labels:
    app: astroflow-redis
spec:
  type: ClusterIP  # Internal only; no external access
  clusterIP: None  # Headless service for StatefulSet
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
  selector:
    app: astroflow-redis
```

### Secret (Redis Password)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: astroflow-redis-credentials
  namespace: controller
type: Opaque
stringData:
  password: <generate-strong-password-here>
```

### PersistentVolume (OpenShift)

- **Storage:** OpenShift-managed persistent storage (OCS, AWS EBS, Azure Managed Disk, GCP Persistent Disk)
- **Size:** Start at 100 GB, grow as tenant data increases
- **Encryption:** Enabled at OpenShift storage provider level (at-rest)
- **Backup:** Automated via OpenShift backup/snapshot mechanism (retention: 30 days)
- **IOPS:** Fast tier (3000+ IOPS for latency-sensitive Redis operations)
- **Reclaim Policy:** Retain (do not delete PV if PVC is removed)

### Co-Location Benefits (Redis + Controller in Same Namespace)

**Low Latency:**
- Controller pod and Redis pod communicate via `localhost:6379` (no network hops)
- Sub-millisecond latency for all data access
- No need for external service discovery

**Simplified Networking:**
- Single OpenShift namespace (`controller`) simplifies:
  - Network policies (Calico)
  - Service mesh (Istio) if deployed
  - Secrets and ConfigMaps
  - RBAC (role-based access control)

**Failure Containment:**
- If Redis pod crashes, Controller detects immediately (pod restart)
- Sentinel auto-promotes replica to primary within seconds
- No cross-namespace network issues to debug

**Resource Isolation:**
- Controller and Redis share the same node (or different nodes via anti-affinity)
- Both use same persistent volume storage class
- Easier capacity planning (single namespace quota)

### Controller → Redis Connection (Same Namespace)

**Connection String (Python/FastAPI):**
```python
import redis

# Kubernetes service name resolves within namespace
REDIS_URL = "redis://:password@astroflow-redis:6379/0"
redis_client = redis.Redis.from_url(REDIS_URL)

# Or via environment variable (injected from Secret)
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
redis_client = redis.Redis(
    host="astroflow-redis",  # Service name (internal DNS)
    port=6379,
    password=REDIS_PASSWORD,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_keepalive=True
)
```

**Service Discovery (OpenShift):**
- Redis StatefulSet creates DNS names: `astroflow-redis-0.astroflow-redis.controller.svc.cluster.local`
- Service creates A record: `astroflow-redis.controller.svc.cluster.local` → Redis pods
- Controller pod simply references: `astroflow-redis:6379` (same namespace)

**Pod Environment Variables (Injected):**
```yaml
env:
- name: REDIS_HOST
  value: "astroflow-redis"  # Service name (same namespace)
- name: REDIS_PORT
  value: "6379"
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: astroflow-redis-credentials
      key: password
```

---

## 12. Monitoring & Operations

### Key Metrics

- **Memory usage:** warn at 70%, alert at 90%
- **Command latency:** p99 < 10ms, p95 < 5ms
- **Evicted keys:** should be 0 (noeviction policy)
- **Replication lag:** < 100ms (primary to replica)
- **RDB save time:** < 10 seconds
- **AOF rewrite time:** < 30 seconds
- **Connected clients:** watch for connection leaks
- **Keyspace size:** track growth over time

### Alerting

- Primary down → Sentinel auto-fails over to replica (transparent to clients)
- Memory full → page oncall (scale PV or archive data immediately)
- High latency → check network, disk I/O, CPU
- Replication lag > 500ms → investigate network/disk issues
- Too many connections → likely connection pool leak

### Backup & Recovery

- **RDB snapshots:** every 60 seconds (or 10K writes), backed up to cloud provider
- **AOF replay:** on pod restart, Redis replays AOF log from last snapshot
- **Data recovery:** in case of corruption, restore from latest snapshot + AOF
- **Disaster recovery drill:** monthly (restore-from-backup test)

### Archival Strategy

After 2 years, old runs and audit logs can be archived to S3:

```
// Controller batch job (monthly):
SCAN 0 MATCH "run:*" COUNT 1000  // Scan all runs
// For runs with created_at > 2 years ago:
GET run:{execution_id}
// Export to S3 as Parquet (batch)
// Once verified: DEL run:{execution_id}
// ZREM run:tenant:{tenant_id}:list {execution_id}
```

This keeps Redis memory footprint stable while preserving long-term audit trail in S3.

---

## 13. Comparison: Redis vs PostgreSQL

| Aspect | Redis (PV-backed) | PostgreSQL |
|---|---|---|
| **Latency** | Sub-ms | 10-50ms |
| **Data model** | Key-value (JSON) | Relational (rows) |
| **Queries** | Simple (GET/SET/ZRANGE) | Complex (JOIN, GROUP BY) |
| **Schema migration** | None (JSON versioning) | Migration scripts |
| **Persistence** | RDB + AOF | WAL |
| **Memory usage** | All data in RAM | Disk-based + cache |
| **HA setup** | Sentinel + Replica | Standby + replication |
| **Scaling** | Cluster (sharding) | Read replicas + sharding |
| **Cost** | Lower (K8s native) | Higher (managed service) |

For AstroFlow, **Redis is the right choice** because:
1. Schema is simple (workflows, runs, tasks — no complex joins)
2. Latency is critical (live graph updates)
3. Data fits in memory (single tenant likely < 10GB)
4. K8s integration is seamless (StatefulSet, PVC)
5. No complex queries needed (mostly key lookups)

