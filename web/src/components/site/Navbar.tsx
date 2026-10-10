"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "./ButtonLink";

const LINKS = [
  { href: "#process", label: "Process" },
  { href: "#cars", label: "Cars" },
  { href: "#product", label: "Product" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
        scrolled ? "border-line bg-bg/80 shadow-card backdrop-blur-md" : "border-transparent bg-bg/0"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Dixi home" className="shrink-0">
          <Logo size={28} />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <ButtonLink href="/dashboard" size="sm">
          Open dashboard
        </ButtonLink>
      </nav>
    </header>
  );
}
