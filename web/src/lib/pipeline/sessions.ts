/* Generations (stored as sessions): every "Build profiles" saves a snapshot, so a PM can reopen earlier generations later.
 * Stored in this browser for now (localStorage); moves to Supabase with the backend.
 */
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

export function saveSession(s: Session) {
  write([s, ...readSessions().filter((x) => x.id !== s.id)]);
}

export function updateSession(id: string, patch: Partial<Session>) {
  write(readSessions().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function deleteSession(id: string) {
  write(readSessions().filter((s) => s.id !== id));
}

export const newSessionId = () => `G-${Date.now().toString(36).toUpperCase()}`;

/** The generation's own dashboard. */
export const generationHref = (id: string) => `/dashboard/generations#${id}`;
/** Back into the pipeline with this generation's decisions and priority loaded, to edit and rebuild. */
export const editHref = (s: Pick<Session, "scope" | "slug" | "id">) => `/dashboard/${s.scope.toLowerCase()}/${s.slug}#session=${s.id}`;

export const sessionTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
