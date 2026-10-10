import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { MarketPicker } from "@/components/dashboard/MarketPicker";

export const metadata: Metadata = { title: "Choose a market · Dixi" };

export default function DashboardPickerPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 bg-bg-soft">
        <MarketPicker />
      </main>
    </>
  );
}
