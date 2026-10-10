import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-card hover:bg-brand-deep",
  secondary: "bg-surface text-ink ring-1 ring-line hover:bg-bg-soft hover:ring-brand/30",
  ghost: "text-ink-soft hover:text-ink",
};

const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[0.95rem]" };

type Props = ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes };

/** Pill button that navigates (next/link). Use for in-app routes and in-page anchors. */
export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: Props) {
  return <Link {...rest} className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`} />;
}
