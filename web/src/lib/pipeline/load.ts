/* Server-only loader: the local BMW-derived file when it exists, otherwise the example set.
 * readFileSync at module scope runs once and is prerendered (see Next docs: caching → predictable values).
 */
import fs from "node:fs";
import path from "node:path";
import { EXAMPLE_PIPELINE } from "./example";
import type { PipelineData, SeriesId } from "./types";

const LOCAL_FILE = path.join(process.cwd(), "data-local", "pipeline.json");

function load(): PipelineData {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf-8")) as PipelineData;
  } catch {
    return EXAMPLE_PIPELINE;
  }
}

const DATA = load();

export const pipelineOrigin = () => DATA.origin;
export const seriesData = (id: SeriesId) => DATA.series.find((s) => s.id === id) ?? EXAMPLE_PIPELINE.series.find((s) => s.id === id)!;
