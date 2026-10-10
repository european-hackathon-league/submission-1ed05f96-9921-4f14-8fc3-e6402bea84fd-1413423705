/* POST /api/scoring-advice  { text, current }  →  ScoringAdvice
 * Turns a manager's instruction into proposed scoring settings. The model only proposes; the UI applies after review.
 * Key: OPENAI_API_KEY from the environment, or (local dev) the git-ignored repo-root .env. Without a key: keyword fallback.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SCORING, type ScoringSettings } from "@/lib/pipeline/scoring";
import { adviseByRules, clampSettings, type ScoringAdvice } from "@/lib/pipeline/scoring-advice";

const MODELS = [process.env.OPENAI_MODEL_FAST, "gpt-6-luna", "gpt-5-mini", "gpt-4.1-mini"].filter(Boolean) as string[];

function apiKey(): string | null {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const env = fs.readFileSync(path.join(process.cwd(), "..", ".env"), "utf-8");
    const m = env.match(/^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*["']?([^"'\n#]+)/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const SYSTEM = `You tune the scoring of Dixi, a tool that ranks customer feature requests for the next BMW model.
Score = weighted mean of demand (customers asking), market backing (competitors and trends) and principle fit (BMW principles),
then decision memory: a past reject lowers the score by rejectPenalty × strength, strength = 0.5^(days/halfLifeDays);
if demand grew by at least resurfaceAt since the reject, the penalty is lifted; a past keep adds 10 × keepBonus × strength points.
hideRejected hides past rejects instead of ranking them lower; memoryScope is "market" (same market only) or "all".
Ranges: wDemand, wBacking, wFit, rejectPenalty, keepBonus in 0–1; halfLifeDays 30–1095; resurfaceAt 0.1–1.5 (0.3 = +30%).
Change only what the manager's instruction implies; keep everything else as in the current settings.
The settings apply to every series and market. If the instruction names one series or market, say in the summary that the change applies to all of them.
Return JSON only. "changes": one short plain-English sentence per changed setting saying old → new and why. "summary": one or two sentences.`;

const SCHEMA = {
  name: "scoring_advice",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["settings", "changes", "summary"],
    properties: {
      settings: {
        type: "object",
        additionalProperties: false,
        required: ["wDemand", "wBacking", "wFit", "rejectPenalty", "keepBonus", "halfLifeDays", "resurfaceAt", "hideRejected", "memoryScope"],
        properties: {
          wDemand: { type: "number" },
          wBacking: { type: "number" },
          wFit: { type: "number" },
          rejectPenalty: { type: "number" },
          keepBonus: { type: "number" },
          halfLifeDays: { type: "number" },
          resurfaceAt: { type: "number" },
          hideRejected: { type: "boolean" },
          memoryScope: { type: "string", enum: ["market", "all"] },
        },
      },
      changes: { type: "array", items: { type: "string" } },
      summary: { type: "string" },
    },
  },
};

export async function POST(request: Request) {
  let body: { text?: unknown; current?: Partial<ScoringSettings> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
  if (text.length < 3) return Response.json({ error: "Write an instruction first." }, { status: 400 });
  const current = clampSettings(body.current ?? {}, DEFAULT_SCORING);

  const key = apiKey();
  if (!key) return Response.json(adviseByRules(text, current) satisfies ScoringAdvice);

  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Current settings: ${JSON.stringify(current)}\nManager's instruction: ${text}` },
          ],
          response_format: { type: "json_schema", json_schema: SCHEMA },
        }),
      });
      if (res.status === 404 || res.status === 400) {
        console.warn("[scoring-advice]", model, res.status, (await res.text()).slice(0, 300));
        continue; // model not available: try the next one
      }
      if (!res.ok) break;
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      const advice: ScoringAdvice = {
        settings: clampSettings(parsed.settings ?? {}, current),
        changes: Array.isArray(parsed.changes) ? parsed.changes.slice(0, 9).map(String) : [],
        summary: String(parsed.summary ?? ""),
        source: "ai",
        model,
      };
      return Response.json(advice);
    } catch (e) {
      console.warn("[scoring-advice]", model, String(e).slice(0, 200));
      /* network or parse error: try the next model, then fall back */
    }
  }
  return Response.json(adviseByRules(text, current) satisfies ScoringAdvice);
}
