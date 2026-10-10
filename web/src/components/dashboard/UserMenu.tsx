"use client";

import { Check, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TEAM, initials, setUser, useUser } from "@/lib/user";

/** Who is deciding. No login yet: pick a team member or type a name; decisions record it with the time. */
export function UserMenu() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setName(user.name);
          setRole(user.role);
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left ring-1 ring-line transition-colors hover:bg-bg-soft"
        title="Who is deciding"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-ink text-[0.7rem] font-semibold text-white">{initials(user.name)}</span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-xs font-medium text-ink">{user.name}</span>
          <span className="block text-[0.65rem] text-muted">{user.role}</span>
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="Who is deciding" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-card border border-line bg-surface p-3 shadow-float">
          <p className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <UserRound aria-hidden className="size-3.5" /> Who is deciding
          </p>
          <p className="mt-1 px-1 text-[0.7rem] text-muted">No login yet. Every decision is saved with this name and the time.</p>
          <ul className="mt-2 flex flex-col">
            {TEAM.map((t) => {
              const on = t.name === user.name;
              return (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => {
                      setUser(t);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-bg-soft ${on ? "bg-brand-soft" : ""}`}
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-bg-soft text-[0.7rem] font-semibold text-ink ring-1 ring-line">{initials(t.name)}</span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm text-ink">{t.name}</span>
                      <span className="block truncate text-[0.7rem] text-muted">{t.role}</span>
                    </span>
                    {on && <Check aria-hidden className="size-4 text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setUser({ name, role });
              setOpen(false);
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" className="rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Your role" aria-label="Your role" className="rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none" />
            <button type="submit" className="h-8 rounded-full bg-ink text-sm font-medium text-white hover:bg-brand-deep">
              Use this name
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
