import type { Metadata } from "next";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";
import { Process } from "@/components/landing/Process";
import { Product } from "@/components/landing/Product";

export const metadata: Metadata = {
  title: "Dixi · Traceable requirements for the next BMW",
  description:
    "Dixi listens to customers market by market, weighs every signal and turns it into requirements, with a traceable reason for every decision.",
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Process />
        <Product />
      </main>
      <Footer />
    </>
  );
}
