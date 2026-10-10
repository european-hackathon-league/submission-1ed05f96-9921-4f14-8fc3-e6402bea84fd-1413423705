"use client";

import { useEffect, useRef, useState } from "react";
import { REJECT_REASONS } from "@/lib/pipeline/profiles";
import { initials, useUser } from "@/lib/user";
import type { FeatureRequest } from "@/lib/pipeline/types";

/** Modal asking why a request is rejected. A reason is required; it is saved as a decision. */
export function RejectDialog({
  request,
  onCancel,
  onConfirm,
}: {
  request: FeatureRequest | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const user = useUser();
  const [preset, setPreset] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (request && !d.open) {
      setPreset(null);
      setNote("");
      d.showModal();
    } else if (!request && d.open) d.close();
  }, [request]);

  const reason = [preset, note.trim()].filter(Boolean).join(": ");
  const valid = preset !== null || note.trim().length >= 3;

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="reject-title"
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
    >
      {request && (
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onConfirm(reason);
          }}
          className="flex flex-col gap-4 p-5 sm:p-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-human">Reject request</p>
            <h2 id="reject-title" className="mt-1 text-lg font-semibold tracking-tight">
              Why are you rejecting “{request.title}”?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Your reason is saved in Decisions and shows on every profile this request could have shaped.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-bg-soft py-1 pl-1 pr-3 text-xs text-ink-soft ring-1 ring-line">
              <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[0.6rem] font-semibold text-white">{initials(user.name)}</span>
              Recorded as <span className="font-medium text-ink">{user.name}</span> · {user.role} · now
            </p>
          </div>

          <fieldset>
            <legend className="sr-only">Common reasons</legend>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((r) => {
                const on = preset === r;
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPreset(on ? null : r)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none ${
                      on ? "bg-human text-white" : "bg-bg-soft text-ink-soft ring-1 ring-line hover:ring-human/40"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Explain in your words {preset ? <span className="font-normal text-muted">(optional)</span> : <span className="font-normal text-human">(required)</span>}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus
              placeholder="e.g. Our principle P1 says the car stays compact; this would add 8 cm."
              className="resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="h-10 rounded-full px-4 text-sm font-medium text-ink-soft ring-1 ring-line hover:bg-bg-soft">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="h-10 rounded-full bg-human px-5 text-sm font-medium text-white shadow-card transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reject and save reason
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
