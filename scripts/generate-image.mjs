#!/usr/bin/env node
// Dixi image generator: OpenAI Images API, zero dependencies (Node >= 20).
//
//   node scripts/generate-image.mjs --prompt "..." --out web/public/images/name.png \
//     [--size 1536x1024|1024x1024|1024x1536|auto] [--quality low|medium|high|auto] \
//     [--model <id>] [--background transparent|opaque|auto] [--ref a.png --ref b.png] [--n 1]
//   node scripts/generate-image.mjs --prompt-file scripts/prompts/landing.json [--out-dir web/public/images]
//
// The API key is read from process.env.OPENAI_API_KEY or parsed from ../.env
// (relative to this file). It is never printed, logged or written anywhere.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const API = "https://api.openai.com/v1";
const FALLBACK_MODELS = ["gpt-image-2.5-flare", "gpt-image-2", "gpt-image-1"];
const SIZES = ["1536x1024", "1024x1024", "1024x1536", "auto"];
const QUALITIES = ["low", "medium", "high", "auto"];
const BACKGROUNDS = ["transparent", "opaque", "auto"];

// ---------- env ----------
function parseDotEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    const q = val[0];
    if ((q === '"' || q === "'") && val.indexOf(q, 1) > 0) {
      val = val.slice(1, val.indexOf(q, 1));
    } else {
      val = val.replace(/\s+#.*$/, "").trim(); // strip inline comment
    }
    out[m[1]] = val;
  }
  return out;
}

async function loadEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  let fileEnv = {};
  if (existsSync(envPath)) fileEnv = parseDotEnv(await readFile(envPath, "utf8"));
  const key = process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || fileEnv.OPENAI_IMAGE_MODEL;
  if (!key) die("OPENAI_API_KEY not found in environment or in .env at the repo root.");
  return { key, model };
}

// ---------- cli ----------
function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const a = { ref: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) die(`unexpected argument: ${t}`);
    const k = t.slice(2);
    if (k === "help" || k === "h") { a.help = true; continue; }
    const v = argv[++i];
    if (v === undefined) die(`missing value for --${k}`);
    if (k === "ref") a.ref.push(v);
    else a[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return a;
}

const USAGE = `usage:
  node scripts/generate-image.mjs --prompt "..." --out web/public/images/name.png
      [--size 1536x1024|1024x1024|1024x1536|auto] [--quality low|medium|high|auto]
      [--model <id>] [--background transparent|opaque|auto] [--ref img.png ...] [--n 1]
  node scripts/generate-image.mjs --prompt-file prompts.json [--out-dir web/public/images]
      (array of {name, prompt, size, quality, background, ref?})`;

function validate(job) {
  if (!job.prompt) die(`job "${job.name ?? job.out}": prompt is required`);
  if (job.size && !SIZES.includes(job.size)) die(`invalid size ${job.size} (use ${SIZES.join(", ")})`);
  if (job.quality && !QUALITIES.includes(job.quality)) die(`invalid quality ${job.quality}`);
  if (job.background && !BACKGROUNDS.includes(job.background)) die(`invalid background ${job.background}`);
  if (job.n && !(Number(job.n) >= 1 && Number(job.n) <= 10)) die(`invalid n ${job.n}`);
}

// ---------- api ----------
function isModelError(status, err) {
  const msg = `${err?.code ?? ""} ${err?.param ?? ""} ${err?.message ?? ""}`.toLowerCase();
  return (
    status === 404 ||
    err?.code === "model_not_found" ||
    err?.param === "model" ||
    (/model/.test(msg) && /(not found|does not exist|invalid|not supported|unknown|access)/.test(msg))
  );
}

async function callApi(key, job, model) {
  const headers = { Authorization: `Bearer ${key}` };
  let url, body;
  if (job.ref?.length) {
    url = `${API}/images/edits`;
    body = new FormData();
    body.append("model", model);
    body.append("prompt", job.prompt);
    for (const r of job.ref) {
      const p = path.resolve(r);
      if (!existsSync(p)) die(`reference image not found: ${r}`);
      const ext = path.extname(p).toLowerCase();
      const type = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
      body.append("image[]", new Blob([await readFile(p)], { type }), path.basename(p));
    }
    if (job.size) body.append("size", job.size);
    if (job.quality) body.append("quality", job.quality);
    if (job.background) body.append("background", job.background);
    if (job.n) body.append("n", String(job.n));
  } else {
    url = `${API}/images/generations`;
    headers["Content-Type"] = "application/json";
    const payload = { model, prompt: job.prompt };
    if (job.size) payload.size = job.size;
    if (job.quality) payload.quality = job.quality;
    if (job.background) payload.background = job.background;
    if (job.n) payload.n = Number(job.n);
    body = JSON.stringify(payload);
  }
  const res = await fetch(url, { method: "POST", headers, body });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 500) } }; }
  return { status: res.status, ok: res.ok, json };
}

async function generate(key, job, envModel) {
  // Explicit --model: use only that. Otherwise env model (if any) then the fallback chain.
  const candidates = job.model
    ? [job.model]
    : [...new Set([envModel, ...FALLBACK_MODELS].filter(Boolean))];
  let last;
  for (const model of candidates) {
    const r = await callApi(key, job, model);
    if (r.ok) return { model, data: r.json };
    last = r;
    const err = r.json?.error;
    if (candidates.length > 1 && isModelError(r.status, err) && model !== candidates.at(-1)) {
      console.warn(`  model "${model}" unavailable (${r.status}: ${err?.message ?? "unknown"}); falling back`);
      continue;
    }
    break;
  }
  const err = last.json?.error;
  throw new Error(`OpenAI API ${last.status}: ${err?.message ?? "unknown error"}${err?.code ? ` [${err.code}]` : ""}`);
}

// ---------- output ----------
function pngSize(buf) {
  if (buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

async function runJob(key, envModel, job) {
  validate(job);
  const outPath = path.resolve(job.out);
  await mkdir(path.dirname(outPath), { recursive: true });
  console.log(`→ ${path.relative(process.cwd(), outPath)} (${job.ref?.length ? "edit" : "generate"}, ${job.size ?? "default size"}, ${job.quality ?? "default quality"})`);
  const t0 = Date.now();
  const { model, data } = await generate(key, job, envModel);
  const items = data.data ?? [];
  if (!items.length) throw new Error("API returned no images");
  const written = [];
  for (let i = 0; i < items.length; i++) {
    const b64 = items[i].b64_json;
    if (!b64) throw new Error("API response had no b64_json");
    const buf = Buffer.from(b64, "base64");
    const p = items.length === 1 ? outPath : outPath.replace(/(\.[a-z0-9]+)?$/i, `-${i + 1}$1`);
    await writeFile(p, buf);
    const dim = pngSize(buf);
    const sidecar = {
      file: path.basename(p),
      ai_generated: true,
      label: "AI concept",
      prompt: job.prompt,
      revised_prompt: items[i].revised_prompt ?? null,
      model,
      endpoint: job.ref?.length ? "images/edits" : "images/generations",
      references: job.ref?.length ? job.ref.map((r) => path.relative(REPO_ROOT, path.resolve(r))) : [],
      size: job.size ?? "default",
      actual_dimensions: dim ? `${dim.width}x${dim.height}` : null,
      quality: job.quality ?? "default",
      background: job.background ?? "default",
      usage: data.usage ?? null,
      created: new Date().toISOString(),
    };
    await writeFile(`${p}.json`, JSON.stringify(sidecar, null, 2) + "\n");
    written.push(p);
    console.log(`  ✓ ${path.relative(process.cwd(), p)}  ${sidecar.actual_dimensions ?? "?"}  ${(buf.length / 1024).toFixed(0)} KB  model=${model}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  if (data.usage) console.log(`  usage: ${JSON.stringify(data.usage)}`);
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.prompt && !args.promptFile)) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }
  const { key, model: envModel } = await loadEnv();
  const common = { model: args.model, n: args.n };
  let jobs;
  if (args.promptFile) {
    const list = JSON.parse(await readFile(path.resolve(args.promptFile), "utf8"));
    if (!Array.isArray(list)) die("--prompt-file must contain a JSON array");
    const outDir = args.outDir ?? path.join(REPO_ROOT, "web/public/images");
    const only = args.only ? args.only.split(",") : null;
    jobs = list
      .filter((j) => !only || only.includes(j.name))
      .map((j) => ({
        ...common,
        ...j,
        model: args.model ?? j.model,
        out: j.out ?? path.join(outDir, `${j.name}.png`),
        ref: j.ref ?? [],
      }));
  } else {
    if (!args.out) die("--out is required with --prompt");
    jobs = [{ ...common, prompt: args.prompt, out: args.out, size: args.size, quality: args.quality, background: args.background, ref: args.ref }];
  }
  let failed = 0;
  for (const job of jobs) {
    try {
      await runJob(key, envModel, job);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${job.name ?? job.out}: ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => die(e.message));
