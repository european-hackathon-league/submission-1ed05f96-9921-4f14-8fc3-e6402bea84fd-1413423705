"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, Check, FolderClock, History, LayoutGrid, PencilLine, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CAR_IMAGES } from "@/lib/car-images";
import { simulateCampaigns } from "@/lib/pipeline/analytics";
import { applySocial } from "@/lib/pipeline/profiles";
import { seriesById } from "@/lib/pipeline/series";
import { editHref, sessionTime, updateSession, type Session } from "@/lib/pipeline/sessions";
import { Analytics } from "./Analytics";
import { BannerStat, CarBanner } from "./CarBanner";
import { DecisionLog } from "./DecisionLog";
import { ProfileDetail, ProfileList } from "./Profiles";

type Tab = "profiles" | "analytics" | "decisions";

/** The dashboard of one generation: its profiles, analytics (social test) and decisions. */
export function GenerationView({ initial }: { initial: Session }) {
  const [gen, setGen] = useState(initial);
  const [tab, setTab] = useState<Tab>("profiles");
  const [openProfile, setOpenProfile] = useState<string | null>(null);
  const cfg = seriesById(gen.series);
  const images = CAR_IMAGES[gen.series];

  const profiles = useMemo(
    () => applySocial(gen.profiles, gen.campaigns ? Object.fromEntries(gen.campaigns.map((c) => [c.profileId, c.l3])) : null, cfg.l3Weight),
    [gen, cfg.l3Weight],
  );
  const current = openProfile ? profiles.find((p) => p.id === openProfile) : undefined;
  const all = Object.values(gen.decisions);
  const kept = all.filter((d) => d.action === "keep").length;
  const rejected = all.filter((d) => d.action === "reject").length;
  const wished = all.filter((d) => d.action === "wish").length;

  const launchSocial = () => {
    const campaigns = simulateCampaigns(gen.profiles.map((p) => p.id), `${gen.scope}-${gen.series}-${gen.id}`);
    updateSession(gen.id, { campaigns });
    setGen({ ...gen, campaigns });
  };

  return (
    <div className="flex flex-col gap-6">
      {!current && (
        <CarBanner image={images.front} eager>
          <Link href="/dashboard" className="inline-flex items-center gap-1 self-start text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft aria-hidden className="size-4" /> All generations
          </Link>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-sky">
              <FolderClock aria-hidden className="size-3.5" /> Generation {gen.id} · {sessionTime(gen.createdAt)}
              {gen.createdBy && ` · built by ${gen.createdBy}`}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {gen.seriesName} <span className="text-white/55">· {gen.scopeLabel}</span>
            </h1>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <BannerStat value={profiles.length} label="profiles" icon={<LayoutGrid aria-hidden className="size-4" />} />
            <BannerStat value={kept} label="kept" icon={<Check aria-hidden className="size-4" />} />
            <BannerStat value={rejected} label="rejected" icon={<X aria-hidden className="size-4" />} />
            <BannerStat value={wished} label="wishlist" icon={<Star aria-hidden className="size-4" />} />
          </div>
        </CarBanner>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-3 lg:w-52 lg:shrink-0">
          <Sidebar
            active={tab}
            onSelect={(id) => {
              setOpenProfile(null);
              setTab(id as Tab);
            }}
            items={[
              { id: "profiles", label: "Profiles", icon: LayoutGrid, badge: profiles.length },
              { id: "analytics", label: "Analytics", icon: BarChart3, badge: gen.campaigns ? <span className="inline-block size-1.5 rounded-full bg-good" /> : undefined },
              { id: "decisions", label: "Decisions", icon: History, badge: all.length },
            ]}
          />
          <Link
            href={editHref(gen)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink lg:mr-3"
            title="Open the pipeline with these decisions and priority, then build a new generation"
          >
            <PencilLine aria-hidden className="size-4" /> Edit and rebuild
          </Link>
        </div>

        <div className="min-w-0 flex-1">
          {current ? (
            <ProfileDetail
              profile={current}
              profiles={profiles}
              rank={profiles.indexOf(current)}
              cfg={cfg}
              scopeLabel={gen.scopeLabel}
              decisions={gen.decisions}
              session={gen}
              image={images.second ?? images.front}
              onBack={() => setOpenProfile(null)}
            />
          ) : (
            <section className="flex flex-col gap-5">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{tab === "profiles" ? "Profiles" : tab === "analytics" ? "Analytics" : "Decisions"}</h2>
              {tab === "profiles" && (
                <ProfileList
                  profiles={profiles}
                  cfg={cfg}
                  image={images.front}
                  onOpen={(id) => {
                    setOpenProfile(id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}
              {tab === "analytics" && <Analytics profiles={profiles} campaigns={gen.campaigns} cfg={cfg} scopeLabel={gen.scopeLabel} onLaunch={launchSocial} />}
              {tab === "decisions" && <DecisionLog decisions={gen.decisions} full />}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
