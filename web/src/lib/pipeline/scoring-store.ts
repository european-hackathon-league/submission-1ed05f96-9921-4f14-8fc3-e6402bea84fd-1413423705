"use client";

/* Scoring settings store: localStorage, reactive across tabs. Client only; the rules themselves are in scoring.ts. */
import { useSyncExternalStore } from "react";
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

export function saveScoring(s: ScoringSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export const useScoring = () => useSyncExternalStore(subscribe, read, () => DEFAULT_SCORING);

