"use client";

/* Scoring settings store: localStorage, reactive across tabs, synced to Supabase through the backend (scoring_settings
 * + scoring_changes, a log of every applied change with who and why). Client only; the rules themselves are in scoring.ts. */
import { useSyncExternalStore } from "react";
import { pull, push } from "@/lib/api";
import { currentUser } from "@/lib/user";
import { DEFAULT_SCORING, type ScoringSettings } from "./scoring";

const KEY = "dixi:scoring";
const EVENT = "dixi:scoring";
let cacheRaw: string | null | undefined;
let cache: ScoringSettings = DEFAULT_SCORING;

function read(): ScoringSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = { ...DEFAULT_SCORING, ...(raw ? (JSON.parse(raw) as Partial<ScoringSettings>) : {}) };
    } catch {
      cache = DEFAULT_SCORING;
    }
  }
  return cache;
}

function writeLocal(s: ScoringSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** How a change was made, for the server-side change log. */
export interface ChangeMeta {
  source?: string;
  instruction?: string;
  changes?: string[];
}

/* Sliders call saveScoring on every tick: the server write waits until they settle and logs one change with the diff. */
let pending: { before: ScoringSettings; timer: ReturnType<typeof setTimeout> } | null = null;

function diff(a: ScoringSettings, b: ScoringSettings): string[] {
  return (Object.keys(b) as (keyof ScoringSettings)[]).filter((k) => a[k] !== b[k]).map((k) => `${k}: ${String(a[k])} → ${String(b[k])}`);
}

export function saveScoring(s: ScoringSettings, meta: ChangeMeta = {}) {
  const before = pending?.before ?? read();
  writeLocal(s);
  if (pending) clearTimeout(pending.timer);
  const send = () => {
    pending = null;
    const who = currentUser();
    void push("/settings", {
      method: "PUT",
      body: JSON.stringify({
        settings: s, by: who.name, role: who.role, source: meta.source ?? "sliders",
        instruction: meta.instruction, changes: meta.changes?.length ? meta.changes : diff(before, s),
      }),
    });
  };
  if (meta.source) send();
  else pending = { before, timer: setTimeout(send, 800) };
}

/** Load the team's settings from the backend (the source of truth when it is configured). */
export async function pullScoring(): Promise<void> {
  const remote = await pull<{ settings: ScoringSettings; updatedAt: string | null }>("/settings");
  if (remote?.updatedAt) writeLocal({ ...DEFAULT_SCORING, ...remote.settings });
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

let pulled = false;
function subscribeAndPull(cb: () => void) {
  if (!pulled) {
    pulled = true;
    void pullScoring();
  }
  return subscribe(cb);
}

/** The team's scoring settings; loads the stored ones from the backend once per page. */
export const useScoring = () => useSyncExternalStore(subscribeAndPull, read, () => DEFAULT_SCORING);

