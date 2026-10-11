"use client";

/* Dixi backend client (backend/, FastAPI). NEXT_PUBLIC_API_URL turns on the server side:
 * generations, decisions, scoring settings, L1 principles and agent runs are stored in Supabase through the API.
 * Without it (e.g. a static demo) the app keeps everything in this browser (localStorage), as before.
 * Every write goes to localStorage first and is then sent to the backend, so the UI never waits on the network.
 */
import { useSyncExternalStore } from "react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || null;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("Backend not configured (NEXT_PUBLIC_API_URL).");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
    throw new Error(typeof body?.detail === "string" ? body.detail : `Backend error ${res.status} on ${path}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

/* ---------- sync status (shown in the top bar) ---------- */

export type SyncState = { mode: "local" | "synced" | "error"; at: string | null; error: string | null };
let state: SyncState = { mode: API_URL ? "synced" : "local", at: null, error: null };
const EVENT = "dixi:sync";

function setState(next: SyncState) {
  state = next;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Send a write to the backend; failures are shown in the top bar, the local copy stays. */
export async function push(path: string, init: RequestInit): Promise<boolean> {
  if (!API_URL) return false;
  try {
    await api(path, init);
    setState({ mode: "synced", at: new Date().toISOString(), error: null });
    return true;
  } catch (e) {
    setState({ mode: "error", at: new Date().toISOString(), error: e instanceof Error ? e.message : "Sync failed" });
    return false;
  }
}

/** Read from the backend; null when it is not configured or not reachable (callers keep the local copy). */
export async function pull<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const out = await api<T>(path);
    setState({ mode: "synced", at: new Date().toISOString(), error: null });
    return out;
  } catch (e) {
    setState({ mode: "error", at: new Date().toISOString(), error: e instanceof Error ? e.message : "Backend unreachable" });
    return null;
  }
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    () => state,
    () => state,
  );
}
