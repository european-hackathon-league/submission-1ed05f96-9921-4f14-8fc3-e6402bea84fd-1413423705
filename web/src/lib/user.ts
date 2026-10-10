/* "Who is deciding": a simple local identity until Dixi has a login.
 * Every decision and every generation records this name and role with a timestamp.
 * Team presets are fictional example people.
 */
import { useSyncExternalStore } from "react";

export interface DixiUser {
  name: string;
  role: string;
}

export const TEAM: DixiUser[] = [
  { name: "Lena Hoffmann", role: "Product manager · 1 Series" },
  { name: "Marco Rossi", role: "Product manager · 5 Series" },
  { name: "Sofia Chen", role: "Product manager · 7 Series" },
  { name: "David Okafor", role: "Head of product requirements" },
];

export const DEFAULT_USER: DixiUser = TEAM[1];

const KEY = "dixi:user";
const EVENT = "dixi:user";

let cacheRaw: string | null | undefined;
let cacheUser: DixiUser = DEFAULT_USER;

function read(): DixiUser {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const u = raw ? (JSON.parse(raw) as DixiUser) : null;
      cacheUser = u?.name ? u : DEFAULT_USER;
    } catch {
      cacheUser = DEFAULT_USER;
    }
  }
  return cacheUser;
}

export function setUser(u: DixiUser) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name: u.name.trim() || DEFAULT_USER.name, role: u.role.trim() }));
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

/** The person deciding right now (client components). */
export function useUser(): DixiUser {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_USER);
}

/** Read once, outside React (e.g. inside an event handler). */
export const currentUser = () => (typeof window === "undefined" ? DEFAULT_USER : read());

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
