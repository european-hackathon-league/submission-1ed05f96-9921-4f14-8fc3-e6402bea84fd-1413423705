import type { Metadata } from "next";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";
import { Process } from "@/components/landing/Process";
import { Cars } from "@/components/landing/Cars";
import { Product } from "@/components/landing/Product";

export const metadata: Metadata = {
  title: "Dixi · Traceable requirements for the next BMW",
  description:
    "Pick a market and a BMW series. Dixi groups what customers ask for, checks competitors and trends, and the product manager decides. Every decision is traceable.",
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Process />
        <Cars />
        <Product />
      </main>
      <Footer />
    </>
  );
}
