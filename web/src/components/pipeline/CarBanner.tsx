import Image from "next/image";
import type { CarImage } from "@/lib/car-images";

/** Dark, full-bleed banner: the car photo fades into navy on the left, where the text sits.
 *  The CC BY-SA credit stays visible (small, bottom right) and links to the Commons file page. */
export function CarBanner({ image, eager, children }: { image?: CarImage; eager?: boolean; children: React.ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden rounded-[20px] bg-ink text-white shadow-float">
      {image && (
        <figure className="absolute inset-0 md:left-[30%]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 768px) 70vw, 100vw"
            className="object-cover object-[60%_60%] saturate-[1.05]"
          />
          {/* fade the photo into the navy text side, and darken the bottom for the credit */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink via-ink/55 to-ink/0 md:via-ink/25" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent md:from-ink/40" />
          <figcaption className="absolute bottom-2 right-3 text-[0.65rem] text-white/60">
            <a href={image.page} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
              {image.credit} · modified
            </a>
          </figcaption>
        </figure>
      )}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative flex min-h-[280px] flex-col justify-end gap-3 p-6 pb-8 sm:p-8 md:min-h-[320px] md:max-w-[52%]">{children}</div>
    </header>
  );
}

/** Small glassy stat chip for the banner. */
export function BannerStat({ value, label, icon }: { value: React.ReactNode; label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-md">
      {icon && <span className="text-brand-sky">{icon}</span>}
      <div>
        <p className="text-base font-semibold leading-tight tabular-nums">{value}</p>
        <p className="text-[0.7rem] text-white/65">{label}</p>
      </div>
    </div>
  );
}
