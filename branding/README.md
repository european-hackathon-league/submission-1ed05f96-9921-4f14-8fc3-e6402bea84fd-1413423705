# Dixi brand guide

**Dixi** is named after the Dixi 3/15, BMW's first car (1928). The product listens to customers in every market and turns what they say into traceable requirements for the next BMW.

> The colours are inspired by BMW's public brand and BMW M colours. They are not official BMW design tokens, and Dixi never uses the BMW logo or roundel.

## Files
| File | Use |
|---|---|
| `logo.svg` | Mark + wordmark, for light backgrounds (default) |
| `logo-on-dark.svg` | Mark + wordmark, for dark backgrounds |
| `logo-mark.svg` | Square mark: app icon, favicon (same as `web/src/app/icon.svg`) |
| `tokens.css` | Colour tokens, mirrored from `web/src/app/globals.css` (the app is the source of truth) |
| `brand-sheet.html` | Visual reference: open it in a browser |

In the app, use the React logo `web/src/components/brand/Logo.tsx` (`<Logo />`, `<LogoMark />`).

## The mark
A **globe** (the markets we listen to) crossed by a **decision track**. The track starts at a light-blue node (a signal), passes a BMW-blue node (evidence), and ends at an **M-red node**: the human sign-off. Every requirement in Dixi follows that path.

## Wordmark
Lowercase **dixi**, semibold, tight tracking: "di" in ink, "xi" in BMW blue.

## Colour
Light mode first. The depth of blue shows how strongly a signal counts.

| Role | Token | Hex | Use |
|---|---|---|---|
| Primary | `--brand` | `#1c69d4` | Buttons, links, active states (BMW-style blue) |
| Deep | `--brand-deep` | `#0f3d75` | Headings accents, the track in the logo |
| Sky | `--brand-sky` | `#8ec5ff` | Soft highlights, signal node |
| **L1 Principles** | `--l1` | `#0f3d75` | Hard rules: the strongest layer |
| **L2 Evidence** | `--l2` | `#1c69d4` | Customer studies, feedback, sales |
| **L3 Signals** | `--l3` | `#5aa9f0` | Social, trends, concept tests |
| **Human decision** | `--human` | `#e22718` | Only where a person decides. Use sparingly |
| Good / Bad | `--good` / `--bad` | `#1e8e3e` / `#d93025` | Comment sentiment, approved / rejected |
| Markets | `--eu` `--cn` `--us` `--jp` | `#1c69d4` `#e0483a` `#0f3d75` `#7c5cd6` | Globe and market chips |
| Ink / Muted / Line | `--ink` `--muted` `--line` | `#0d1b2a` `#6b7a8f` `#e3e8ef` | Text, secondary text, borders |
| Background | `--bg` `--bg-soft` | `#ffffff` `#f5f7fb` | Page, alternate sections |

## Type
- **Geist Sans** for everything (headings semibold, tight tracking), **Geist Mono** for IDs and numbers (`R-701`, `G3`).
- Big, calm headlines; short sentences; no jargon.

## Voice
- Plain and short. Name things the way a product manager would ("Postpone", "Why this rank").
- Every number has a source; every decision has a reason.

## Do / don't
- ✅ Red only where a human must act. ✅ Layer colours on anything that carries weight. ✅ Label AI-generated images.
- ❌ No BMW logo, roundel or badges. ❌ No dark-mode-only designs for now. ❌ No gradients on data.
