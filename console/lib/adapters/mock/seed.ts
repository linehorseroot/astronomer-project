/**
 * Seeded in-memory data so the entire Console is explorable with no backend.
 * Templates mirror the starter catalog in docs/TASK_TEMPLATES.md §5.
 */
import type {
  Run,
  Schedule,
  TaskTemplate,
  Workflow,
} from "@/lib/contract";

export const seedTemplates: TaskTemplate[] = [
  {
    key: "http_fetch",
    version: "1.0.0",
    display_name: "HTTP / REST Fetch",
    category: "Extract",
    icon: "globe",
    summary: "Call an endpoint and capture the response.",
    engine_handler: "http_fetch",
    param_schema: {
      type: "object",
      required: ["url", "method"],
      properties: {
        url: { type: "string", title: "URL" },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE"],
          default: "GET",
          title: "Method",
        },
        http_conn_id: { type: "string", title: "Connection" },
      },
    },
    defaults: { retries: 2, timeout_seconds: 300 },
    governance: { tenants: ["*"], roles: ["Scheduler", "Operator"], approval: "approved" },
  },
  {
    key: "snowflake_sql_load",
    version: "2.3.0",
    display_name: "Snowflake SQL Load",
    category: "Data Loading",
    icon: "snowflake",
    summary: "Run a SQL load into a Snowflake schema.",
    engine_handler: "snowflake_sql_load",
    param_schema: {
      type: "object",
      required: ["source_table", "target_schema"],
      properties: {
        source_table: { type: "string", title: "Source table" },
        target_schema: {
          type: "string",
          enum: ["RAW", "STG", "MART"],
          title: "Target schema",
        },
        full_refresh: { type: "boolean", default: false, title: "Full refresh" },
      },
    },
    defaults: { retries: 2, timeout_seconds: 1800 },
    outputs: [{ name: "rows_affected", type: "integer" }],
    governance: { tenants: ["finance", "ops"], roles: ["Scheduler", "Operator"], approval: "approved" },
  },
  {
    key: "sql_transform",
    version: "1.1.0",
    display_name: "SQL Transform",
    category: "Transform",
    icon: "database",
    summary: "Run SQL against a connection.",
    engine_handler: "sql_transform",
    param_schema: {
      type: "object",
      required: ["connection", "sql"],
      properties: {
        connection: { type: "string", title: "Connection" },
        sql: { type: "string", title: "SQL" },
        schema: { type: "string", title: "Schema" },
      },
    },
    defaults: { retries: 1, timeout_seconds: 900 },
    governance: { tenants: ["*"], roles: ["Scheduler", "Operator"], approval: "approved" },
  },
  {
    key: "row_count_check",
    version: "1.0.0",
    display_name: "Row-count Check",
    category: "Quality",
    icon: "check",
    summary: "Assert a query returns within an expected range.",
    engine_handler: "row_count_check",
    param_schema: {
      type: "object",
      required: ["connection", "sql", "min"],
      properties: {
        connection: { type: "string", title: "Connection" },
        sql: { type: "string", title: "SQL" },
        min: { type: "integer", title: "Min rows" },
        max: { type: "integer", title: "Max rows" },
      },
    },
    defaults: { retries: 0, timeout_seconds: 300 },
    governance: { tenants: ["*"], roles: ["Scheduler", "Operator"], approval: "approved" },
  },
  {
    key: "slack_notify",
    version: "1.0.0",
    display_name: "Slack Notify",
    category: "Notify",
    icon: "message-square",
    summary: "Post a message to a Slack channel.",
    engine_handler: "slack_notify",
    param_schema: {
      type: "object",
      required: ["channel", "message"],
      properties: {
        channel: { type: "string", title: "Channel" },
        message: { type: "string", title: "Message" },
        on_status: {
          type: "string",
          enum: ["success", "failed", "always"],
          default: "always",
          title: "On status",
        },
      },
    },
    defaults: { retries: 1, timeout_seconds: 120 },
    governance: { tenants: ["*"], roles: ["Scheduler", "Operator"], approval: "approved" },
  },
];

export const seedWorkflows: Workflow[] = [
  {
    spec_version: "1.0",
    id: "wf_finance_close",
    name: "Daily Finance Close",
    tenant_id: "finance",
    owner: "user:rthangavelu",
    status: "published",
    version: 3,
    updated_at: "2026-06-18T22:10:00Z",
    defaults: { retries: 1, timeout_seconds: 3600, pool: "default" },
    nodes: [
      {
        node_id: "n1",
        template_key: "snowflake_sql_load",
        template_version: "2.3.0",
        display_name: "Load dim_customer",
        params: { source_table: "raw.customers", target_schema: "MART", full_refresh: false },
        retries: 2,
        timeout_seconds: 1800,
        position: { x: 120, y: 80 },
      },
      {
        node_id: "n2",
        template_key: "sql_transform",
        template_version: "1.1.0",
        display_name: "Build fct_revenue",
        params: { connection: "snowflake_default", sql: "INSERT INTO MART.fct_revenue ..." },
        position: { x: 420, y: 80 },
      },
      {
        node_id: "n3",
        template_key: "row_count_check",
        template_version: "1.0.0",
        display_name: "Validate fct_revenue",
        params: { connection: "snowflake_default", sql: "SELECT count(*) FROM MART.fct_revenue", min: 1 },
        position: { x: 720, y: 80 },
      },
      {
        node_id: "n4",
        template_key: "slack_notify",
        template_version: "1.0.0",
        display_name: "Notify #finance",
        params: { channel: "#finance", message: "Finance close complete", on_status: "always" },
        position: { x: 1020, y: 80 },
      },
    ],
    edges: [
      { from: "n1", to: "n2", trigger_rule: "all_success" },
      { from: "n2", to: "n3", trigger_rule: "all_success" },
      { from: "n3", to: "n4", trigger_rule: "all_done" },
    ],
  },
  {
    spec_version: "1.0",
    id: "wf_ops_ingest",
    name: "Ops Hourly Ingest",
    tenant_id: "ops",
    owner: "user:amorgan",
    status: "draft",
    version: 1,
    updated_at: "2026-06-19T09:02:00Z",
    nodes: [
      {
        node_id: "n1",
        template_key: "http_fetch",
        template_version: "1.0.0",
        display_name: "Fetch events",
        params: { url: "https://api.internal/events", method: "GET" },
        position: { x: 120, y: 80 },
      },
      {
        node_id: "n2",
        template_key: "sql_transform",
        template_version: "1.1.0",
        display_name: "Stage events",
        params: { connection: "warehouse", sql: "INSERT INTO stg.events ..." },
        position: { x: 420, y: 80 },
      },
    ],
    edges: [{ from: "n1", to: "n2", trigger_rule: "all_success" }],
  },
];

export const seedSchedules: Schedule[] = [
  {
    id: "sch_finance_nightly",
    workflow_id: "wf_finance_close",
    workflow_version: 3,
    name: "Nightly",
    cron: "0 2 * * *",
    timezone: "America/New_York",
    enabled: true,
    params: {},
  },
];

/** A finished historical run, plus one we will animate live via the simulator. */
export const seedRuns: Run[] = [
  {
    execution_id: "exec_20260618_finance",
    workflow_id: "wf_finance_close",
    workflow_version: 3,
    workflow_name: "Daily Finance Close",
    status: "success",
    started_at: "2026-06-18T02:00:00Z",
    finished_at: "2026-06-18T02:14:32Z",
    tasks: [
      { node_id: "n1", display_name: "Load dim_customer", status: "success", attempt: 1, duration_ms: 412000 },
      { node_id: "n2", display_name: "Build fct_revenue", status: "success", attempt: 1, duration_ms: 305000 },
      { node_id: "n3", display_name: "Validate fct_revenue", status: "success", attempt: 1, duration_ms: 41000 },
      { node_id: "n4", display_name: "Notify #finance", status: "success", attempt: 1, duration_ms: 1200 },
    ],
  },
];
