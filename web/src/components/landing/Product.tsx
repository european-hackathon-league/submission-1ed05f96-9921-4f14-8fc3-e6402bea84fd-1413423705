import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import { CircleHelp, GitBranch, UserCheck, type LucideIcon } from "lucide-react";
import { ProductMock } from "./ProductMock";

const PHOTO_SRC = "/images/product-dashboard.png";

const FEATURES: { title: string; body: string; Icon: LucideIcon }[] = [
  { title: "Lineage", body: "Follow any requirement back to the comments, studies and sales data behind it.", Icon: GitBranch },
  { title: "Human in the loop", body: "The AI drafts. The product manager decides, and every decision carries a reason.", Icon: UserCheck },
  { title: "What we don't know", body: "Missing markets, thin samples and conflicting signals are shown, not hidden.", Icon: CircleHelp },
];

function Quote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <blockquote className={`text-2xl leading-tight font-semibold tracking-tight text-ink text-balance sm:text-3xl ${className ?? ""}`}>
      <p>{children}</p>
    </blockquote>
  );
}

export function Product() {
  // The photo is generated separately; only render it once the file is actually there.
  const hasPhoto = existsSync(path.join(process.cwd(), "public", PHOTO_SRC));

  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <p className="text-sm font-semibold text-brand">Product</p>
        <h2 id="product-title" className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
          Every requirement, <span className="text-brand">traceable to its source.</span>
        </h2>

        <div className="relative mt-12">
          <div aria-hidden className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[32px] bg-[radial-gradient(70%_60%_at_50%_30%,var(--brand-soft),transparent_75%)]" />
          <ProductMock />
        </div>

        <div className={`mt-20 grid gap-10 ${hasPhoto ? "lg:grid-cols-2 lg:items-center" : ""}`}>
          <div className={`grid gap-10 ${hasPhoto ? "" : "md:grid-cols-2 md:gap-16"}`}>
            <div className="border-l-2 border-brand pl-6">
              <Quote>
                The PM decides. <span className="text-muted">The AI shows its work.</span>
              </Quote>
            </div>
            <div className="border-l-2 border-wait pl-6">
              <Quote>
                Know what you don&apos;t know. <span className="text-muted">Gaps are flagged, never averaged away.</span>
              </Quote>
            </div>
          </div>
          {hasPhoto && (
            <figure>
              <div className="overflow-hidden rounded-card bg-bg-soft shadow-float ring-1 ring-line">
              <Image
                src={PHOTO_SRC}
                alt="AI concept image: the Dixi dashboard on a laptop, with a globe, a ranked requirement list and blue charts"
                width={1536}
                height={1024}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full"
              />
              </div>
              <figcaption className="mt-2.5 text-xs text-muted">
                <span className="mr-1.5 rounded bg-surface px-1.5 py-0.5 font-medium text-ink-soft ring-1 ring-line">AI-generated image</span>
                Concept render of the dashboard.
              </figcaption>
            </figure>
          )}
        </div>

        <ul className="mt-20 grid gap-8 border-t border-line pt-10 md:grid-cols-3">
          {FEATURES.map(({ title, body, Icon }) => (
            <li key={title}>
              <Icon className="size-5 text-brand" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
