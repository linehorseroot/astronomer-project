# AstroFlow — Custom Operators & Advanced Capabilities

**Last updated:** 2026-06-21 · **Status:** Spec for v1

Custom operators are the building blocks of AstroFlow workflows. They are deferrable Airflow operators that dispatch work to the Execution Engine and handle a rich set of capabilities: manual interventions, approval gates, file watching, Kafka integration, HTTP connectors, and more. This document describes the operator framework and the capabilities available out of the box.

---

## 1. The custom operator foundation

All custom operators in AstroFlow share a common pattern:

```python
from astroflow_core.operators import DeferrableOperator

class MyCustomOperator(DeferrableOperator):
    """
    A deferrable operator: dispatches work, defers the task,
    and resolves based on Execution Engine results.
    """
    
    def execute(self, context):
        # Extract execution_id from run params (set by Controller)
        execution_id = context["params"].get("execution_id")
        
        # Build command with operator-specific payload
        command = {
            "operator_type": "my_operator",
            "task_id": context["task"].task_id,
            "params": self.params,
            # ... operator-specific config
        }
        
        # Publish to Execution Engine via Kafka
        publish_kafka(
            topic="astroflow.task.command",
            key=execution_id,
            value=command,
        )
        
        # Defer and wait for result event keyed by execution_id + task_id
        self.defer(
            trigger=TaskResultTrigger(
                execution_id=execution_id,
                task_id=context["task"].task_id,
            ),
            method_name="execute_complete",
        )
    
    def execute_complete(self, context, event):
        # Resume: execution engine result arrives via trigger event
        if event["status"] == "success":
            return event.get("result")
        raise AirflowException(event.get("error"))
```

**Key properties:**
- Zero compute in Airflow — only dispatch and defer.
- Worker slot released immediately.
- Result-driven resumption via trigger event.
- Full support for retry, timeout, and SLA policies.

---

## 2. Built-in operator capabilities

### 2.1 Manual Intervention

**Purpose:** Pause the workflow for a human to manually perform or validate a step.

```python
from astroflow_core.operators import ManualInterventionOperator

task = ManualInterventionOperator(
    task_id="approve_deployment",
    description="Review the staging environment and click Continue when ready to deploy to production.",
    # Optional: timeout after which task fails
    timeout_seconds=3600,
)
```

**Behavior:**
- Task enters a `PAUSED` state in the Execution Engine.
- Live UI displays an approval card with the description.
- Operator can define custom fields for human input (e.g., "Approved by", "Notes").
- Human clicks "Continue" → Execution Engine marks task `success` with input payload.
- If timeout expires, task fails unless operator specifies a fallback.

**Use cases:** pre-deployment approvals, QA sign-offs, manual data validation.

---

### 2.2 Approval Gates

**Purpose:** Formal approval workflow with routing, timeouts, and escalation.

```python
from astroflow_core.operators import ApprovalGateOperator

task = ApprovalGateOperator(
    task_id="finance_approval",
    description="Approve expense report for processing.",
    approvers=["finance_team"],  # RBAC role
    cc=["manager"],               # notify but don't require
    timeout_seconds=86400,        # 24 hours
    escalate_after=3600,          # escalate to manager after 1 hour
    escalate_to="directors",      # escalate to this role
)
```

**Behavior:**
- Creates an approval request with routing rules.
- Notified users see the request in their dashboard.
- First approver to click "Approve" or "Reject" decides the outcome.
- If timeout expires, task fails (or follows a fallback policy).
- Escalation rules fire at specified intervals if not yet approved.
- Full audit trail: who approved, when, any comments.

**Use cases:** financial approvals, change control, risk assessments.

---

### 2.3 File Watchers & Sensors

**Purpose:** Pause workflow until a file appears or a condition is met.

```python
from astroflow_core.operators import FileSensorOperator, ExternalTaskSensorOperator

# Wait for a specific file
file_task = FileSensorOperator(
    task_id="wait_for_data_file",
    filepath="/mnt/data/daily_extract_{{ ds }}.parquet",
    poke_interval=60,      # check every 60 seconds
    timeout_seconds=86400, # fail if not present after 24 hours
    mode="poke",           # or "reschedule" for long waits
)

# Wait for external task in another DAG
external_task = ExternalTaskSensorOperator(
    task_id="wait_for_upstream",
    external_dag_id="upstream_etl",
    external_task_id="final_step",
    poke_interval=60,
    timeout_seconds=86400,
)
```

**Behavior:**
- Task defers in the Execution Engine.
- Sensor polls the condition on a schedule (poke_interval).
- On success: Execution Engine marks task `success`.
- On timeout: task fails.
- "reschedule" mode: doesn't block triggerer; cleaner for long waits.

**Use cases:** waiting for data files, external job completion, time-based gates.

---

### 2.4 Kafka Connectors

**Purpose:** Consume from / produce to Kafka topics as a workflow step.

```python
from astroflow_core.operators import KafkaConsumerOperator, KafkaProducerOperator

# Consume messages and validate
consume_task = KafkaConsumerOperator(
    task_id="consume_events",
    kafka_topic="events.orders",
    group_id="workflow_{{ dag_id }}",
    timeout_seconds=300,
    batch_size=100,          # max messages per run
    message_handler="json",  # parse as JSON
)

# Produce to a topic
produce_task = KafkaProducerOperator(
    task_id="publish_results",
    kafka_topic="results.processed",
    payload={
        "source_run": "{{ task_instance.run_id }}",
        "status": "{{ previous_task.result }}",
    },
    key_field="source_run",  # for partitioning
)
```

**Behavior:**
- Consumer: drains Kafka topic (or up to batch_size), passes messages to next step.
- Producer: publishes a structured message to Kafka.
- Both defer in the Execution Engine.
- Full support for Kafka authentication (SASL, mTLS via secrets backend).
- Messages are logged and auditable.

**Use cases:** event-driven workflows, real-time data pipelines, cross-system coordination.

---

### 2.5 HTTP Connectors

**Purpose:** Call external APIs or webhooks.

```python
from astroflow_core.operators import HTTPOperator

task = HTTPOperator(
    task_id="call_ml_service",
    http_conn_id="ml_service",      # resolves from secrets backend
    endpoint="/predict",
    method="POST",
    headers={"Content-Type": "application/json"},
    data={
        "model_id": "v42",
        "input": "{{ task_instance.xcom_pull(task_ids='prepare_data') }}",
    },
    response_check={"status_in": [200]},   # declarative; evaluated by the Execution Engine (no inline code)
    timeout_seconds=300,
    retries=2,
)
```

**Behavior:**
- Defers in the Execution Engine.
- Engine makes HTTP request with full retry + timeout support.
- Response body returned as task result (XCom).
- Supports templating, response validation, and custom headers.
- Credentials resolved server-side from secrets backend.

**Use cases:** calling ML inference services, webhooks, REST APIs, external validation.

---

## 3. Extensibility: custom operator templates

Engineers can create **custom operator templates** for domain-specific needs:

```python
# Example: custom BigQuery operator
from astroflow_core.operators import CustomOperatorTemplate

class BigQueryLoadOperator(DeferrableOperator):
    """
    Custom template for BigQuery loads.
    Registers as a task-template in the template catalog.
    """
    
    template_info = {
        "key": "bigquery_load",
        "display_name": "BigQuery Load",
        "param_schema": {
            "type": "object",
            "required": ["gcs_uri", "destination_table"],
            "properties": {
                "gcs_uri": {"type": "string"},
                "destination_table": {"type": "string"},
                "auto_detect_schema": {"type": "boolean", "default": False},
            },
        },
    }
    
    def execute(self, context):
        # Custom logic: dispatch a BigQuery job to the Execution Engine
        command = {
            "operator_type": "bigquery_load",
            "gcs_uri": self.gcs_uri,
            "destination_table": self.destination_table,
            "auto_detect_schema": self.auto_detect_schema,
        }
        # ... defer logic ...
```

**Benefits:**
- Governs which operators users can use (via template approval).
- Enforces parameter schemas and validation.
- Version control over operator behavior.
- Audit trail of which template ran which version.

---

## 4. Advanced patterns

### 4.1 Conditional gates

Chain approval and sensor operators:

```
[Transform Data] 
    ↓
[File Sensor: wait for validation report]
    ↓
[Approval Gate: review validation results]
    ↓
[Publish to prod topic]
```

**Benefit:** Combines automated waiting + human judgment.

### 4.2 Retry and backoff strategies

Each operator inherits Airflow's retry semantics:

```python
task = ApprovalGateOperator(
    task_id="approval",
    retries=0,           # approvals don't retry
    retry_delay=timedelta(minutes=5),
)

task2 = HTTPOperator(
    task_id="api_call",
    retries=3,                              # retry on transient failures
    retry_delay=timedelta(seconds=10),
    retry_exponential_backoff=True,         # exponential backoff
    max_retry_delay=timedelta(minutes=10),
)
```

### 4.3 XCom: passing data between tasks

Tasks can pass results via XCom (Airflow's cross-task communication):

```python
# Consume task stores messages in XCom
consume = KafkaConsumerOperator(
    task_id="consume",
    # ... stores batch of messages in XCom
)

# Next task uses the result
process = HTTPOperator(
    task_id="process",
    data={
        # Pull result from previous task
        "messages": "{{ task_instance.xcom_pull(task_ids='consume') }}",
    },
)
```

---

## 5. Error handling & observability

### 5.1 Task timeouts and SLAs

Every operator supports timeout and SLA monitoring:

```python
task = ManualInterventionOperator(
    task_id="approval",
    timeout_seconds=3600,           # task fails if not approved in 1 hour
    sla=timedelta(hours=2),         # alert if not completed in 2 hours
)
```

### 5.2 Error logs and audit trail

All operator actions are logged:
- Operator dispatch → Execution Engine
- Execution Engine work + retries
- Approval decisions (who, when, comments)
- File sensor state transitions
- HTTP call details (request, response, duration)

Accessible via:
- Task instance logs in the UI
- Audit trail in the Controller's state store
- Exported to observability platform (Datadog, etc.)

---

## 6. Governance & security

### 6.1 Role-based approval routing

Approval operators respect RBAC:

```python
task = ApprovalGateOperator(
    task_id="finance_approval",
    approvers=["finance_team"],   # only members of this role can approve
    cc=["managers"],              # notified but cannot approve
)
```

### 6.2 Secrets resolution

Credentials are resolved server-side:

```python
task = HTTPOperator(
    task_id="api_call",
    http_conn_id="ml_service",  # resolved by Execution Engine
    # Connection string never travels through UI or events
)
```

### 6.3 Audit and compliance

Every operator action is attributed and logged:
- Manual intervention: who clicked Continue, when, any input
- Approval gate: who approved, rejection reason, timestamp
- File sensor: which file triggered success
- Kafka: message offsets, batch counts
- HTTP: endpoint called, status code, duration

---

## 7. Roadmap

**v1.0 (next):**
- Built-in operators above (ManualIntervention, ApprovalGate, FileSensor, Kafka, HTTP)
- Custom operator templates with schema governance

**v1.1:**
- Dynamic branching: conditional operators that route to different downstream tasks
- Composite operators: chain multiple operations (e.g., HTTP call + validation + approval)
- Operator plugins: extensibility mechanism for external operator packages

**v2.0:**
- Inbound webhook operators (receive/await events pushed from external systems)
- Operator plugin SDK (publish external operator packages as governed templates)
- Sub-workflow operators (invoke a published workflow as a single step)

> **Note — templates vs. framework features.** Notification (Slack/Email) and database
> (SQL/Snowflake load, SQL transform) capabilities ship in **v1** as **task templates** —
> they run as `task.command` payloads on the Execution Engine, not as new deferral
> mechanisms. See the v1 starter catalog in [TASK_TEMPLATES.md](TASK_TEMPLATES.md) §5. The
> items above are genuinely new *operator-framework* capabilities, not catalog templates.

---

## 8. Security & best practices

1. **Never pass secrets in params.** Use `http_conn_id` / `kafka_conn_id` so the Execution Engine resolves them.
2. **Use timeout and SLA fields.** Prevent workflows from hanging indefinitely.
3. **Approval gates on prod changes.** Combine file sensors (validation done) + approval (human sign-off).
4. **Monitor escalation.** If approvals frequently time out, adjust the workflow or resource allocation.
5. **Audit all approvals.** Check the task instance logs and audit trail for compliance reviews.

---

## 9. Relationship to other docs

- [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) — Runtime model that powers these operators (deferred execution, Execution Engine).
- [TASK_TEMPLATES.md](TASK_TEMPLATES.md) — How custom operators register as task templates in the catalog.
- [WORKFLOW_BUILDER.md](WORKFLOW_BUILDER.md) — How users compose these operators into workflows.
- [CONSOLE_UI.md](CONSOLE_UI.md) — How approval gates and manual interventions appear in the dashboard.
