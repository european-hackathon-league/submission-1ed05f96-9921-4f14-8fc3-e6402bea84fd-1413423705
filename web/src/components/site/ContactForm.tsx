"use client";

import { Check, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

/* Client-side only: there is no backend. Submitting shows a demo notice with the team email; nothing is sent. */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (e.currentTarget.checkValidity()) setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-card bg-good-soft p-5 ring-1 ring-good/20">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-good text-white">
          <Check className="size-4" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-ink">
            This form is a demo and nothing was sent. Please email{" "}
            <a href="mailto:team@dixi.dev" className="text-brand hover:text-brand-deep">
              team@dixi.dev
            </a>
            .
          </p>
          <button type="button" onClick={() => setSent(false)} className="mt-1 text-sm font-medium text-brand hover:text-brand-deep">
            Back to the form
          </button>
        </div>
      </div>
    );
  }

  const field =
    "mt-1.5 w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink ring-1 ring-line placeholder:text-muted transition-shadow focus:outline-none focus:ring-2 focus:ring-brand motion-reduce:transition-none";

  return (
    <form onSubmit={onSubmit} className="grid gap-4" aria-label="Contact form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          Name
          <input name="name" required autoComplete="name" className={field} placeholder="Your name" />
        </label>
        <label className="block text-sm font-medium text-ink">
          Email
          <input name="email" type="email" required autoComplete="email" className={field} placeholder="you@company.com" />
        </label>
      </div>
      <label className="block text-sm font-medium text-ink">
        Message
        <textarea name="message" required rows={4} className={`${field} resize-y`} placeholder="What would you like to know?" />
      </label>
      <div>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[0.95rem] font-medium text-white shadow-card transition-colors hover:bg-brand-deep motion-reduce:transition-none"
        >
          Send (demo) <Send className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
