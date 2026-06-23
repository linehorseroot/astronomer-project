/**
 * Adapter selection by NEXT_PUBLIC_API_MODE (`mock` | `live`). Default is mock,
 * so the whole Console is explorable offline. See docs/ARCHITECTURE.md §1.
 */
import type { DataAdapter } from "./types";
import { MockAdapter } from "./mock/mockAdapter";
import { HttpAdapter } from "./http/httpAdapter";

export type { DataAdapter, EventScope, Unsubscribe } from "./types";

let adapter: DataAdapter | null = null;

export function getAdapter(): DataAdapter {
  if (adapter) return adapter;
  const mode = process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
  adapter = mode === "live" ? new HttpAdapter() : new MockAdapter();
  return adapter;
}
