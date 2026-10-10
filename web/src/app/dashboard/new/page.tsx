import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = { title: "New analysis · Dixi" };

export default function NewAnalysisPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <DashboardHome tab="new" />
      </main>
    </>
  );
}
