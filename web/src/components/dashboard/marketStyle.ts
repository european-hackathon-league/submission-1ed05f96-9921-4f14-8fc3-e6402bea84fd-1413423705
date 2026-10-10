import type { MarketId } from "@/lib/markets";

/** Static class names per market colour (Tailwind needs literal strings). */
export const MARKET_DOT: Record<MarketId, string> = {
  EU: "bg-eu",
  CN: "bg-cn",
  US: "bg-us",
  JP: "bg-jp",
};
