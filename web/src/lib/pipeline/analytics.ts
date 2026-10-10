/* L3 social test, simulated: each profile is "posted" and tracked for 14 days.
 * Deterministic per market + series + profile, so the same inputs always show the same curves.
 * Replace with real post metrics once a social channel is connected.
 */

export interface DayPoint {
  day: number;
  impressions: number;
  /** Engagements / impressions, 0–1. */
  engagement: number;
  /** Share of positive reactions, 0–1. */
  positive: number;
}

export interface Campaign {
  profileId: string;
  days: DayPoint[];
  impressions: number;
  engagement: number;
  positive: number;
  shares: number;
  /** 0–1 summary used as the L3 score: mix of engagement and positive share. */
  l3: number;
}

export const CAMPAIGN_DAYS = 14;

function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function simulateCampaigns(profileIds: string[], seed: string): Campaign[] {
  return profileIds.map((id) => {
    const r = rng(`${seed}:${id}`);
    const base = 0.025 + r() * 0.035; // starting engagement 2.5–6 %
    const drift = (r() - 0.4) * 0.003; // some profiles gain, some fade
    const reach = 8000 + r() * 9000;
    const pos = 0.45 + r() * 0.35;
    const days: DayPoint[] = Array.from({ length: CAMPAIGN_DAYS }, (_, d) => {
      const noise = (r() - 0.5) * 0.006;
      return {
        day: d + 1,
        impressions: Math.round(reach * (1 + d * 0.12) * (0.85 + r() * 0.3)),
        engagement: Math.max(0.005, base + drift * d + noise),
        positive: Math.min(0.95, Math.max(0.2, pos + (r() - 0.5) * 0.08 + drift * d * 4)),
      };
    });
    const impressions = days.reduce((s, x) => s + x.impressions, 0);
    const engagement = days.reduce((s, x) => s + x.engagement * x.impressions, 0) / impressions;
    const positive = days.reduce((s, x) => s + x.positive * x.impressions, 0) / impressions;
    return {
      profileId: id,
      days,
      impressions,
      engagement,
      positive,
      shares: Math.round(impressions * engagement * 0.12),
      l3: Math.min(1, 0.5 * Math.min(1, engagement / 0.08) + 0.5 * positive),
    };
  });
}

/** Last-7-days engagement vs the first 7: who is gaining momentum. */
export function momentum(c: Campaign): number {
  const half = Math.floor(c.days.length / 2);
  const avg = (xs: DayPoint[]) => xs.reduce((s, x) => s + x.engagement, 0) / xs.length;
  return avg(c.days.slice(half)) / avg(c.days.slice(0, half)) - 1;
}
