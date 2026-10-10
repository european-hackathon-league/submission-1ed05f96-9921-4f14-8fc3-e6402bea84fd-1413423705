import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "./ButtonLink";
import { ContactForm } from "./ContactForm";

const LINKS = [
  { href: "#process", label: "Process" },
  { href: "#cars", label: "Cars" },
  { href: "#product", label: "Product" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Footer() {
  return (
    <footer id="contact" aria-labelledby="contact-title" className="scroll-mt-20 border-t border-line bg-bg-soft">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-20 lg:py-24">
        <div>
          <p className="text-sm font-semibold text-brand">Contact</p>
          <h2 id="contact-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
            Talk to the team.
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            Built for the BMW challenge at the EHL Hackathon, Munich 2026.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-card ring-1 ring-line">
            <Mail className="size-4 text-brand" aria-hidden />
            <span className="text-sm text-muted">Team email</span>
            <span className="font-mono text-sm text-ink select-all">team@dixi.dev</span>
          </div>
          <div className="mt-8">
            <ButtonLink href="/dashboard">
              Open dashboard <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>

        <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line sm:p-8">
          <ContactForm />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size={22} withWordmark={false} />
            <span>© Dixi 2026 · Named after the Dixi, BMW&apos;s first car (1928)</span>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
