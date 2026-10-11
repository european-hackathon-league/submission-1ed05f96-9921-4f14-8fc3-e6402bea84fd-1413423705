"use client";

import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { useState } from "react";
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

/** Ask about this generation. The backend agent (generation_analyst) looks facts up with tools — the generation,
 *  principles, principle assessment, research run, decision memory — and answers only from them. Under each answer:
 *  what it retrieved (recorded by the backend, not written by the model). */
export function GenerationChat({ session, profileId }: { session: Session; profileId?: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <section data-no-print aria-labelledby="chat-heading" className="rounded-card border border-line bg-surface p-4 shadow-card">
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
          {error && (
            <p role="alert" className="mt-2 text-xs text-bad">
              {error}
            </p>
          )}
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
  );
}
