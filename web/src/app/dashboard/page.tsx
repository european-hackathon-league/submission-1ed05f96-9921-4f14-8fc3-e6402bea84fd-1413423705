import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = { title: "Dashboard · Dixi" };

export default function DashboardPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <DashboardHome tab="generations" />
      </main>
    </>
  );
}
