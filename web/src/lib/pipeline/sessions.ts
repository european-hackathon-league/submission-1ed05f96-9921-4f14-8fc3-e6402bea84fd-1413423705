/* Generations (stored as sessions): every "Build profiles" saves a snapshot, so a PM can reopen earlier generations later
 * and the next generation reads their decisions as decision memory (scoring.ts buildMemory).
 * Stored in Supabase through the backend (table generations) when NEXT_PUBLIC_API_URL is set, with a copy in this
 * browser (localStorage) so the UI works offline and never waits on the network.
 */
import { pull, push } from "@/lib/api";
import type { MarketScope } from "@/lib/dashboard-data";
import type { Campaign } from "./analytics";
import type { Decisions, Profile } from "./profiles";
import type { SeriesId } from "./types";

export interface Session {
  id: string;
  createdAt: string;
  /** Who built this generation. */
  createdBy?: string;
  createdByRole?: string;
  scope: MarketScope;
  scopeLabel: string;
  series: SeriesId;
  seriesName: string;
  slug: string;
  profiles: Profile[];
  decisions: Decisions;
  order: string[];
  campaigns: Campaign[] | null;
  /** Agent runs this build used (Supabase ids), for the audit trail. */
  researchRunId?: string | null;
  assessmentId?: string | null;
}

const KEY = "dixi:sessions";
const MAX = 30;

export function readSessions(): Session[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Session[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function write(list: Session[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage full or blocked: sessions stay for this visit only */
  }
}

function toServer(s: Session) {
  return { id: s.id, series: s.series, market: s.scope, createdAt: s.createdAt, createdBy: s.createdBy, createdByRole: s.createdByRole, payload: s };
}

export function saveSession(s: Session) {
  write([s, ...readSessions().filter((x) => x.id !== s.id)]);
  void push(`/generations/${s.id}`, { method: "PUT", body: JSON.stringify(toServer(s)) });
}

export function updateSession(id: string, patch: Partial<Session>) {
  write(readSessions().map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const s = readSessions().find((x) => x.id === id);
  if (s) void push(`/generations/${id}`, { method: "PUT", body: JSON.stringify(toServer(s)) });
}

export function deleteSession(id: string) {
  write(readSessions().filter((s) => s.id !== id));
  void push(`/generations/${id}`, { method: "DELETE" });
}

/** Merge the generations stored in Supabase into this browser (server wins by id) and upload local-only ones.
 *  Called before decision memory is built, so the next generation sees every earlier build, not only this browser's. */
export async function pullSessions(): Promise<Session[]> {
  const remote = await pull<{ id: string; payload: Session }[]>("/generations");
  if (!remote) return readSessions();
  const byId = new Map(readSessions().map((s) => [s.id, s]));
  const remoteIds = new Set(remote.map((g) => g.id));
  for (const s of byId.values()) if (!remoteIds.has(s.id)) void push(`/generations/${s.id}`, { method: "PUT", body: JSON.stringify(toServer(s)) });
  remote.forEach((g) => byId.set(g.id, g.payload));
  write([...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  return readSessions();
}

export const newSessionId = () => `G-${Date.now().toString(36).toUpperCase()}`;

/** The generation's own dashboard. */
export const generationHref = (id: string) => `/dashboard/generations#${id}`;
/** Back into the pipeline with this generation's decisions and priority loaded, to edit and rebuild. */
export const editHref = (s: Pick<Session, "scope" | "slug" | "id">) => `/dashboard/${s.scope.toLowerCase()}/${s.slug}#session=${s.id}`;

export const sessionTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
