"use client";

import { Loader2, MessageCircleQuestion, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";
import { syncGeneration, type Session } from "@/lib/pipeline/sessions";

interface Turn {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const SUGGESTIONS = [
  "Why is this profile ranked where it is?",
  "Which requests were rejected, by whom and why?",
  "Which BMW principles does this profile strain?",
  "What evidence is missing for this generation?",
];

/** Floating chat on the profile page: a round button bottom right opens the panel. Ask about this generation. The backend agent (generation_analyst) looks facts up with tools — the generation,
 *  principles, principle assessment, research run, decision memory — and answers only from them. Under each answer:
 *  what it retrieved (recorded by the backend, not written by the model). */
export function GenerationChat({ session, profileId }: { session: Session; profileId?: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [turns, busy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: "user", content: q }]);
    setText("");
    try {
      if (!session.synced && !(await syncGeneration(session))) throw new Error("Could not store this generation on the server.");
      const out = await api<{ answer: string; sources: string[] }>("/chat/generation", {
        method: "POST",
        body: JSON.stringify({ generationId: session.id, question: q, profileId, history }),
      });
      setTurns((t) => [...t, { role: "assistant", content: out.answer, sources: out.sources }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The chat failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-no-print>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="generation-chat"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close the chat" : "Ask about this generation"}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-float transition-transform hover:scale-105 motion-reduce:transition-none"
      >
        {open ? <X aria-hidden className="size-6" /> : <MessageCircleQuestion aria-hidden className="size-6" />}
        <span className="sr-only">{open ? "Close the chat" : "Ask about this generation"}</span>
      </button>

      {open && (
    <section
      id="generation-chat"
      role="dialog"
      aria-labelledby="chat-heading"
      className="fixed bottom-24 right-4 z-40 flex max-h-[min(70vh,640px)] w-[min(420px,calc(100vw-2rem))] flex-col rounded-card border border-line bg-surface p-4 shadow-float sm:right-6"
    >
      <h2 id="chat-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageCircleQuestion aria-hidden className="size-4 text-brand" /> Ask about this generation
      </h2>
      <p className="mt-1 text-xs text-muted">
        Answers come only from this generation&apos;s stored facts: profiles, decisions, principles, the principle assessment, research and decision
        memory. Each answer lists what it looked up.
      </p>

      {!API_URL ? (
        <p className="mt-3 text-sm text-muted">The chat needs the Dixi backend (set NEXT_PUBLIC_API_URL).</p>
      ) : (
        <>
          <div className="-mx-1 mt-1 min-h-0 flex-1 overflow-y-auto px-1">
          {turns.length > 0 && (
            <ol className="mt-3 flex flex-col gap-3">
              {turns.map((t, i) => (
                <li key={i} className={t.role === "user" ? "self-end max-w-[85%]" : "max-w-[95%]"}>
                  <p className={`whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${t.role === "user" ? "bg-brand text-white" : "bg-bg-soft text-ink"}`}>{t.content}</p>
                  {t.sources && t.sources.length > 0 && <p className="mt-1 px-1 text-[11px] text-muted">Looked up: {t.sources.join(" · ")}</p>}
                </li>
              ))}
            </ol>
          )}
          {turns.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:text-brand hover:ring-brand/40">
                  {s}
                </button>
              ))}
            </div>
          )}
          {busy && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Loader2 aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" /> Looking up facts…</p>}
          {error && (
            <p role="alert" className="mt-2 text-xs text-bad">
              {error}
            </p>
          )}
          <div ref={end} />
          </div>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Your question
            </label>
            <input
              id="chat-input"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Why was the rear fridge rejected?"
              maxLength={1000}
              className="h-10 min-w-0 flex-1 rounded-full bg-bg-soft px-4 text-sm text-ink ring-1 ring-line outline-none focus:ring-brand"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden className="size-4" />}
              Ask
            </button>
          </form>
        </>
      )}
    </section>
      )}
    </div>
  );
}
