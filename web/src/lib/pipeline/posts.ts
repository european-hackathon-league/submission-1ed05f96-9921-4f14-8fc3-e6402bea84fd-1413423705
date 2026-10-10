/* Social posts for the L3 test: one story per profile, built from the market's top requests.
 * The image is AI-generated (scripts/prompts/posts.json, sidecar next to each file); the copy is written from the profile.
 * Sell the need, not the spec: name the frustration customers told us about, then the feeling once it is solved.
 */
import type { Profile } from "./profiles";
import type { SeriesConfig } from "./series";

export interface Post {
  profileId: string;
  image: string;
  alt: string;
  headline: string;
  caption: string;
  hashtags: string[];
}

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

const STORY: Record<string, { headline: (s: string) => string; open: string; close: (s: string) => string; scene: string }> = {
  fix: {
    headline: () => "Every drive starts calm.",
    open: "told us what gets in the way every morning",
    close: (s) => `The next ${s} fixes the basics first. No workarounds, no second tries: you get in, and it just works.`,
    scene: "a calm city morning, phone connecting on the charging pad, simple physical controls",
  },
  tech: {
    headline: () => "The road ahead, upgraded.",
    open: "asked for technology that helps instead of distracts",
    close: (s) => `The next ${s} thinks one step ahead, so you can enjoy the drive again.`,
    scene: "a night highway with a glowing digital cockpit and driver assistance",
  },
  comfort: {
    headline: () => "Arrive as rested as you left.",
    open: "want the cabin to feel like a quiet place of their own",
    close: (s) => `Crafted materials, a calmer ride, room to breathe: the next ${s} makes the journey the best part of the day.`,
    scene: "golden-hour light over stitched leather, wood trim and a panoramic roof",
  },
};

export function buildPost(p: Profile, cfg: SeriesConfig, scopeLabel: string): Post {
  const story = STORY[p.id] ?? STORY.fix;
  const asks = p.requests.slice(0, 3).map((r) => lower(r.title));
  const wish = p.wishes[0];
  const caption = [
    `Drivers in ${scopeLabel === "USA" ? "the USA" : scopeLabel} ${story.open}: ${list(asks)}.`,
    story.close(cfg.name),
    wish ? `Inspired by what the market loves: ${lower(wish.title)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    profileId: p.id,
    image: `/images/posts/${cfg.id.toLowerCase()}-${p.id}.webp`,
    alt: `AI-generated concept image: a ${cfg.name.toLowerCase().replace(" series", "-series")}-style car, ${story.scene}`,
    headline: story.headline(cfg.name),
    caption,
    hashtags: [`#Next${cfg.name.replace(" ", "")}`, `#${p.name.replace(/[^A-Za-z]/g, "")}`, `#${scopeLabel.replace(/\s/g, "")}`, "#ConceptTest"],
  };
}
