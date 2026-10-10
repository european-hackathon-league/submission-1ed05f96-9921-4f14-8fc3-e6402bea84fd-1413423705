import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { ScoringSettingsForm } from "@/components/dashboard/ScoringSettings";

export const metadata: Metadata = { title: "Settings · Dixi" };

export default function SettingsPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Scoring and decision memory</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          How Dixi ranks feature requests, and how much past decisions count. Rejected requests are not proposed again at full strength, unless demand has grown or time has
          passed.
        </p>
        <div className="mt-8">
          <ScoringSettingsForm />
        </div>
      </main>
    </>
  );
}
