# scripts/

## generate-image.mjs

This script generates images for Dixi through the OpenAI Images API. It needs Node 20 or newer and has no dependencies: it uses the built-in `fetch`, `FormData` and `Blob`.

- **Without `--ref`** it calls `POST /v1/images/generations`, which makes an image from text.
- **With one or more `--ref`** it calls `POST /v1/images/edits` as multipart, with one `image[]` field per reference. Use this to composite or restyle existing images, for example to combine component shots into a hero image.
- It decodes `b64_json`, writes the PNG, creates folders as needed and prints the path, the dimensions and the model it used.
- It writes a **sidecar** `<image>.png.json` next to every image. The sidecar records the prompt, model, endpoint, references, size, quality, token usage and creation time, with `"ai_generated": true` and `"label": "AI concept"`. This keeps every AI visual traceable and lets the UI label it.

### Usage

```bash
# single image
node scripts/generate-image.mjs \
  --prompt "Isometric illustration of three translucent layers, no text" \
  --out web/public/images/layers.png --size 1536x1024 --quality medium

# edit / composite from references
node scripts/generate-image.mjs --prompt "Combine these into one clean hero shot" \
  --ref web/public/images/a.png --ref web/public/images/b.png \
  --out web/public/images/hero.png --size 1536x1024

# batch from a prompt file (array of {name, prompt, size, quality, background, ref?})
node scripts/generate-image.mjs --prompt-file scripts/prompts/landing.json
node scripts/generate-image.mjs --prompt-file scripts/prompts/landing.json --only product-dashboard
```

| Option | Values | Default |
|---|---|---|
| `--size` | `1536x1024`, `1024x1024`, `1024x1536`, `auto` | API default |
| `--quality` | `low`, `medium`, `high`, `auto` | API default |
| `--background` | `transparent`, `opaque`, `auto` | API default |
| `--model` | any image model id | see below |
| `--n` | 1–10 | 1 (extra images are saved as `name-2.png`, …) |
| `--out-dir` | output folder for `--prompt-file` | `web/public/images` |
| `--only` | comma-separated names from the prompt file | all |

**Model selection**
- `--model` uses exactly the model you name.
- Otherwise the script tries `OPENAI_IMAGE_MODEL` (if set), then `gpt-image-2.5-flare`, then `gpt-image-2`, then `gpt-image-1`. It moves to the next model only when the API rejects the model id.
- `gpt-image-2.5-flare` was verified as working on 2026-10-10.

### API key

- The key is read from `process.env.OPENAI_API_KEY`. If it is not set there, the script parses the repo-root `.env`, which is git-ignored through `.env` / `.env.*` in `.gitignore`. Quotes, `export` and comments are handled.
- The script never prints, logs or writes the key. Error messages show only the HTTP status and the API's error message.
- Never commit `.env`, and never paste the key into prompts, sidecars or docs.

### Cost

- Each call is billed by image output tokens, so cost grows with size and quality.
- Measured on 2026-10-10 with `gpt-image-2.5-flare`:
  - 1536x1024 at high quality: about 1,400 output tokens.
  - 1536x1024 at medium quality: about 350 output tokens.
- Check the current per-token price on OpenAI's pricing page. Use `low` or `medium` quality while you iterate, and switch to `high` only for the final hero image.
- The `usage` block in each sidecar is the record of what a given image cost.

## Rules (mandatory)

- **Label every AI image as AI-generated in the UI** (EU AI Act Art. 50 transparency). Show an "AI concept" caption or badge wherever the image appears. The sidecar's `ai_generated: true` is the source of truth.
- **Never generate BMW logos, badges, roundels, brand names or real people**, and never imitate BMW's trademarks. The palette may be *BMW-inspired* (e.g. `#1c69d4`), but the brand marks may not appear. Always put "no logos, no brand names, no readable text, no people" in the prompt and check the result visually before using it.
- Never send BMW data (dataset, slides, screenshots of `data/`) as `--ref` images or inside prompts.

## prompts/

- `prompts/landing.json`: landing-page visuals.
  - `product-dashboard`: hero, high quality.
  - `layers-abstract`: three-layer illustration, medium quality.
