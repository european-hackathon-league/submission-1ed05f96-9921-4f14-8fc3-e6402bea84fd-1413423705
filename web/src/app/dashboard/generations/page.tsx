import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { GenerationPage } from "@/components/pipeline/GenerationPage";

export const metadata: Metadata = { title: "Generation · Dixi" };

/* /dashboard/generations#<id>: generations live in the browser, so the client reads the id from the hash. */
export default function GenerationRoute() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <GenerationPage />
      </main>
    </>
  );
}
