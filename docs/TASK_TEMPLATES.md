# AstroFlow — Task Templates

**Last updated:** 2026-06-21 · **Status:** Spec for v1

Task templates are the reusable building blocks of every workflow. Each template is a
governed, parameterized, versioned task type that engineers author once and business users
drop into the [workflow builder](WORKFLOW_BUILDER.md) many times. Extensive, well-curated
templates are what make self-service workflow building both powerful and safe.

---

## 1. What a task template is

A task template binds three things:

1. **An implementation** — a deferrable operator that dispatches a command to the Execution
   Engine and defers (it performs **no compute in Airflow**), defined and versioned in code
   by engineers. The actual work runs in the Execution Engine; see
   [CUSTOM_OPERATORS.md](CUSTOM_OPERATORS.md) §1 and the deferred-execution model in
   [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).
2. **A parameter schema** — a JSON Schema describing the inputs a user may set, used to
   auto-generate the inspector form and to validate values.
3. **Presentation & governance metadata** — display name, icon, category, description,
   examples, and which tenants/roles may use it.

Users never see the implementation; they see a friendly card with a form.

## 2. Template schema

```jsonc
{
  "key": "snowflake_sql_load",
  "version": "2.3.0",                       // semver; pinned per workflow node
  "display_name": "Snowflake SQL Load",
  "category": "Data Loading",               // for palette grouping
  "icon": "snowflake",
  "summary": "Run a SQL load into a Snowflake schema.",
  "description": "Executes a parameterized SQL load with optional full refresh...",
  "engine_handler": "snowflake_sql_load",   // Execution Engine handler invoked via task.command (operator_type) — not an Airflow compute operator
  "param_schema": {                         // JSON Schema (rendered + validated)
    "type": "object",
    "required": ["source_table", "target_schema"],
    "properties": {
      "source_table":  { "type": "string", "title": "Source table" },
      "target_schema": { "type": "string", "enum": ["RAW", "STG", "MART"], "title": "Target schema" },
      "full_refresh":  { "type": "boolean", "default": false, "title": "Full refresh" }
    }
  },
  "defaults": { "retries": 2, "timeout_seconds": 1800 },
  "outputs": [{ "name": "rows_affected", "type": "integer" }],  // optional, for XCom-style passing
  "governance": {
    "tenants": ["finance", "ops"],          // who may use it; "*" = all
    "roles": ["Scheduler", "Operator"],
    "approval": "approved"                   // draft | approved | deprecated
  },
  "docs_url": "https://internal/docs/templates/snowflake_sql_load"
}
```

### Notes
- **`param_schema` drives the UI.** The inspector form is generated from it — field types,
  enums become dropdowns, `required` becomes validation, `title`/`description` become
  labels and help text. No bespoke form code per template.
- **Versioning is semver.** A workflow node pins `template_version`; upgrading is an
  explicit user action with a diff, never silent.
- **Outputs** enable simple data passing between nodes (compiled to XCom) where templates
  declare them.
- **Uniform runtime.** Every template — regardless of type — compiles to the same deferrable
  operator that dispatches a `task.command` and defers; only the command payload (keyed by
  `engine_handler`) differs, not the mechanism. See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) §4.

## 3. Governance & lifecycle

```
draft  ──►  approved  ──►  deprecated
```

- Engineers author templates in code (the template registry); CI validates the schema and
  registers them. *Recommend a Git-based template registry with CI.*
- Only `approved` templates appear in the palette for permitted tenants/roles.
- `deprecated` templates stay runnable for existing workflows but cannot be added to new
  ones; the builder surfaces an upgrade hint.
- Every template change is versioned and audited.

## 4. Catalog organization

The palette groups templates by **category** with search and favorites. Starter categories:

| Category | Example templates |
|---|---|
| **Data Loading** | Snowflake SQL Load, BigQuery Load, S3 → Warehouse Copy |
| **Transform** | dbt Run, SQL Transform, Python Transform |
| **Extract** | HTTP / REST Fetch, Database Extract, SFTP Pull |
| **Sensors / Waits** | File Sensor, Table-Partition Sensor, External Task Sensor, Time Delay |
| **Control flow** | Branch (if/else), Switch, Join / Gate |
| **Notify** | Slack Notify, Email Notify, PagerDuty Alert |
| **Quality** | Row-count Check, Schema Check, Freshness Check |
| **Custom** | Tenant-specific approved templates |

## 5. Starter template set (v1)

A minimum catalog so the builder is useful on day one:

1. **HTTP / REST Fetch** — call an endpoint, capture response. Params: url, method,
   headers, auth connection, body.
2. **SQL Transform** — run SQL against a connection. Params: connection, sql, schema.
3. **Snowflake SQL Load** — load into a Snowflake schema. Params as above.
4. **Python Transform** — run an approved, registered Python callable. Params: callable
   key + typed args (no arbitrary code; only registered callables).
5. **File Sensor** — wait for a file/partition. Params: path/connection, poke interval,
   timeout.
6. **Branch (if/else)** — route downstream based on a simple expression over upstream
   outputs.
7. **Slack Notify** — post a message. Params: channel, message template, on-status.
8. **Email Notify** — send an email. Params: to, subject, body template, on-status.
9. **Row-count Check** — assert a query returns within an expected range.
10. **Time Delay** — wait a fixed duration.

> **Security note:** "Python Transform" exposes only **registered, approved callables** by
> key — users supply typed arguments, never source code. This preserves the
> "no arbitrary code" guardrail.

## 6. Mock data for Console-first build

The Console's `MockAdapter` seeds the full starter catalog above with realistic schemas so
the palette, search, inspector forms, and validation all work before the backend exists.
Each mock template includes valid `param_schema`, defaults, and governance metadata so the
builder behaves exactly as it will in production.

## 7. Open questions

- **Template parameters referencing connections/secrets:** render a connection picker that
  lists names only (values resolved server-side). *Recommend yes.*
- **Composite templates** (a template that is itself a small sub-graph): support in v1 or
  defer? *Recommend defer to v1.1.*
- **Per-tenant overrides** of a shared template's defaults: allow? *Recommend yes, as
  policy, not code.*
