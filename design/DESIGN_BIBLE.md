# Katitos — DESIGN BIBLE

**The single source of truth.** Every later agent MUST obey this document. When a
detail is ambiguous, this file wins. When you add a feature, you do not invent a
new visual language — you _perform within this one_.

---

## 0. The Direction — "Bolshoi Nocturne"

> _An imperial opera box rendered in oxblood velvet, candle-warmed gold leaf, and
> snow-marble — where her wine-purple royalty and his olive-cream warmth meet on a
> black-and-white stage, every square edge framed in a single gilt hairline._

Katitos is a private love app for two: **Anastasia** (Russia) and **Vicente**
(Chile). Long-distance, international. The brand mark is a cat head with
negative-space **heart eyes**, drawn in wine/oxblood `#6E1423` and snow white
`#FFFAFA`.

The app must feel like **being inside an opera theater the moment before the
performance** — the hush, the dimmed house, a single candle-warm light spilling
from above and footlights glowing from below. Majestic, romantic, modern,
minimalist, never cramped. Ornament is **light on a line**, never decoration for
its own sake.

### The romantic constraint (the most important thing in this file)

The palette is the two people themselves, fused:

| Person          | Colors                                                        | Role in the language                               |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| **Anastasia**   | wine red, brown, black, white, **purple**                     | the velvet, the imperial royal note                |
| **Vicente**     | military/**olive** green, **cream** (sandstorm), black, white | the affirming voice, the warm light                |
| **Shared**      | black & white                                                 | the stage they share                               |
| **The theater** | **gilt gold**                                                 | the binding that mediates them so they never clash |

Her wine/brown/purple velvet + his olive/cream warmth, stitched together by gold.
This fusion **is** the international relationship made visible. We never use
literal flags — we use the **two-color seam** (§9).

---

## 1. Hard constraints (non-negotiable)

1. **SQUARE corners everywhere.** `border-radius: 0`. Ornament comes from gilded
   hairline borders and inset catch-lights, never from rounding.
2. **Mobile-first single column**, `max-width: 32rem`, centered.
3. **Dark, theatrical base.** `color-scheme: dark`.
4. **Generous spacing.** Nothing collapsed or cramped. Use the spacing scale (§5).
5. **Animations are GPU-only** — `transform` and `opacity` only. Everything must
   respect `prefers-reduced-motion: reduce`.
6. **Preserve the token variable NAMES** components already consume: `--color-bg`,
   `--color-surface`, `--color-surface-2`, `--color-border`, `--color-fg`,
   `--color-muted`, `--color-accent`, `--color-accent-fg`, `--color-danger`,
   `--color-success`, `--color-warning`. You may restyle, never rename.
7. **Snow white `#FFFAFA` is sacred** — it lives in the logo heart-eyes and the
   single most affirmative moment on a screen. True white always reads as a
   heartbeat. Default foreground is warm **Marble Snow**, not pure white.

---

## 2. Color tokens — the full table

All values live in `:root` in `src/index.css`. Tailwind maps them (see
`tailwind.config.js`). Use the Tailwind class, never a raw hex, in components.

### Core (the variable names components consume)

| Token               | Hex       | Name            | When to use                                                                                |
| ------------------- | --------- | --------------- | ------------------------------------------------------------------------------------------ |
| `--color-bg`        | `#100408` | Curtain Dusk    | App background — the darkened house before lights. Near-black oxblood, never neutral gray. |
| `--color-surface`   | `#1B0810` | Velvet Box      | Raised panels, the base card surface — deeper wine-black.                                  |
| `--color-surface-2` | `#2A0E18` | Loge Crimson    | Lifted cards / sheets / popovers — the lit interior of a box.                              |
| `--color-border`    | `#C9A24B` | Gilt Hairline   | The ONLY ornament. 1px gold-leaf borders, dividers, focus rings.                           |
| `--color-fg`        | `#FFFAFA` | Marble Snow     | Primary text and icons (the brand white as ivory stage light).                             |
| `--color-muted`     | `#B89A86` | Candle Ash      | Secondary text, dimmed program copy, metadata, placeholders.                               |
| `--color-accent`    | `#6E1423` | Bolshoi Wine    | THE velvet curtain / brand oxblood. Primary romantic action, primary buttons.              |
| `--color-accent-fg` | `#FFFAFA` | Snow            | Text/icons on top of accent.                                                               |
| `--color-danger`    | `#C0303A` | Lacquer Red     | Destructive actions, errors. Fabergé enamel red — distinct from wine.                      |
| `--color-success`   | `#6B7344` | Olive Sash      | Success / affirmative / "yes". Vicente's military green — his voice.                       |
| `--color-warning`   | `#E8D9B5` | Sandstorm Cream | Gentle attention, soft badges. Vicente's cream.                                            |

### Romantic accent layer (extended — also exposed to Tailwind)

| Token            | Hex       | Name            | When to use                                                                                        |
| ---------------- | --------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `--color-purple` | `#4A2350` | Imperial Purple | Her purple / Russian royal note. Secondary highlights, selected states, the heart-eyes glow.       |
| `--color-brown`  | `#3E2218` | Cordovan Brown  | Her brown. Velvet shadow tone between surfaces, warm insets/dividers.                              |
| `--color-lapis`  | `#16182E` | Lapis Box-Seat  | Imperial Russian blue. Optional alt surface for "special" panels that want a cooler imperial lean. |
| `--color-copper` | `#B5633A` | Andes Copper    | Chile / Pacific dusk. Rare warm accent inside the seam and warm highlights.                        |
| `--gold`         | `#C9A24B` | Gold Leaf       | Alias of border — the theater gilt, for fills/icons/text.                                          |
| `--gilt-bright`  | `#E4C36A` | Bright Gilt     | Light pole of gilt gradients.                                                                      |
| `--gilt-deep`    | `#9C7A2E` | Deep Gilt       | Dark pole of gilt gradients.                                                                       |
| `--gilt-spark`   | `#FFF1C9` | Gilt Spark      | The hot specular highlight in the gilt gradient/shimmer.                                           |

### Tailwind class names

`bg-bg surface surface-2 border-border text-fg text-muted bg-accent text-accent-fg`
`bg-danger bg-success bg-warning` plus the extended: `text-purple bg-brown bg-lapis`
`text-copper text-gold bg-gold border-gold`.

---

## 3. Typography

**Two typefaces. A velvet-bound libretto: engraved serif titles over clean modern
typesetting.**

- **Display serif — `Cormorant Garamond`** (Google Fonts). High-contrast
  Renaissance serif with tall, lyrical ascenders — reads like an engraved opera
  program. Weights loaded: `300, 400, 500, 600` + `300 italic, 600 italic`.
  Use **only** for: headings, the two names, the word "Katitos", pull-quotes,
  romantic asides. Variable: `--font-display`.
- **Body / UI sans — `Manrope`** (Google Fonts). Geometric-humanist, quiet,
  extremely legible on a phone, warm enough not to fight the serif. Weights:
  `400, 500, 600, 700`. Variable: `--font-sans`. Numerals/dates use `500` with
  `tabular-nums` (long-distance day counts must align).

### Google Fonts link (already in `index.html`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,600&family=Manrope:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Scale

| Role                     | Family                 | Size / line-height                 | Weight / tracking         | Tailwind                |
| ------------------------ | ---------------------- | ---------------------------------- | ------------------------- | ----------------------- |
| Display title            | Cormorant              | `clamp(2.5rem, 9vw, 3.5rem)` / 1.1 | 600 / `-0.01em`           | `font-display text-5xl` |
| Section title            | Cormorant              | `2rem` / 1.15                      | 600 / `-0.01em`           | `font-display text-3xl` |
| Pull-quote / aside       | Cormorant italic       | `1.5rem` / 1.3                     | 300 italic                | `font-display italic`   |
| Eyebrow / playbill label | Cormorant SC-feel      | `0.8125rem` / 1                    | 600 / `0.28em`, uppercase | `.eyebrow` (§6)         |
| Body                     | Manrope                | `1rem` / 1.6                       | 400                       | `font-sans`             |
| UI label / button        | Manrope                | `0.875rem` / 1.4                   | 600 / `0.02em`            | `font-sans`             |
| Caption / meta           | Manrope                | `0.8125rem` / 1.5                  | 500, `text-muted`         | `text-muted`            |
| Numerals / dates         | Manrope `tabular-nums` | contextual                         | 500                       | `tabular-nums`          |

**Leading:** body `1.6`, display `1.1`. Generous. Never tighten body below 1.5.

---

## 4. SQUARE corners — how ornament is achieved

`--radius`, `--radius-lg`, `--radius-xl` are **all `0`**. We never round.

Ornament is achieved three ways, in order of preference:

1. **The gilt hairline** — a single 1px gold-leaf border. The signature. Either a
   flat `1px solid var(--color-border)` or, for the "catches light" version, a
   `border-image` from the gilt gradient. Use `.gilt-hairline` (§6).
2. **The inset catch-light** — `box-shadow: inset 0 1px 0 rgba(228,195,106,.18)` so
   the top edge of a square panel glints like polished leaf. Baked into
   `--shadow-catch`.
3. **The theatrical drop shadow** — `--shadow-loge`, deep and soft, so content sits
   in a pool of light (chiaroscuro). Never a hard or colored shadow.

Decorative fleurons (the eyebrow's flanking hairlines, §6) are also permitted —
they are still _lines_, not fills or rounding.

---

## 5. Spacing & rhythm — uncramped is mandatory

| Token             | Value     | Use                                                      |
| ----------------- | --------- | -------------------------------------------------------- |
| `--app-max-width` | `32rem`   | The phone column. Center it; never exceed it.            |
| `--space-stage`   | `1.75rem` | Default screen gutter / card padding. Nothing gets less. |
| `--space-act`     | `3rem`    | Vertical gap between major sections ("acts").            |

Rules: minimum `1.75rem` horizontal screen padding. Cards padded `1.75rem`.
Stacked sections separated by `3rem`. Touch targets ≥ `44px`. When in doubt, add
air. A cramped screen is a failed screen.

---

## 6. Texture toolkit — velvet, marble, gilt (CSS only, no images)

All implemented as utility classes in `src/index.css`. Copy-paste ready.

### Stage background (already applied to `body`)

```css
background: var(--grad-house); /* radial spotlight from top-center */
/* with a fixed footlight glow rising from the bottom + a fixed grain overlay */
```

### Class reference

| Class                 | What it does                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.velvet`             | Velvet surface: house gradient + nap (3px repeating lines) + diagonal sheen. The default "box" panel look.                              |
| `.velvet-2`           | Same nap/sheen over Loge Crimson — the lifted card surface.                                                                             |
| `.gilt-hairline`      | 1px square gold-leaf border via `border-image` from `--grad-gilt` + top inset catch-light. **The signature frame.**                     |
| `.gilt-hairline-flat` | Cheaper flat `1px solid var(--color-border)` version for dense lists.                                                                   |
| `.gilt-text`          | Text filled with the gilt gradient (`background-clip: text`). For numerals, accents, the logo word.                                     |
| `.marble`             | Inverted ivory marble panel (light): snow base + low-opacity veining. For "lit stage" content moments; use wine serif text on it.       |
| `.eyebrow`            | Playbill section label: Cormorant, uppercase, `0.28em` tracking, gold, centered, flanked by two short gilt hairline rules (fleuron).    |
| `.seam`               | The two-color fusion divider (see §9).                                                                                                  |
| `.footlight`          | A warm candle glow element (radial gradient) to drop behind a hero.                                                                     |
| `.grain`              | Fixed fractal-noise overlay at ~2.5% opacity to kill OLED banding. (Applied globally on `body::before`; class available for local use.) |

### Gradient tokens (in `:root`)

```css
--grad-gilt: linear-gradient(
  135deg,
  var(--gilt-deep) 0%,
  var(--gilt-bright) 45%,
  var(--gilt-spark) 50%,
  var(--gilt-bright) 55%,
  var(--gilt-deep) 100%
);
--grad-house: radial-gradient(
  120% 90% at 50% -10%,
  #2a0e18 0%,
  #1b0810 45%,
  #100408 100%
);
--grad-velvet-sheen: linear-gradient(
  105deg,
  transparent 40%,
  rgba(228, 195, 106, 0.05) 50%,
  transparent 60%
);
--grad-footlight: radial-gradient(
  60% 42% at 50% 100%,
  rgba(201, 162, 75, 0.1) 0%,
  rgba(110, 20, 35, 0.05) 38%,
  transparent 72%
);
--grad-sash: linear-gradient(
  115deg,
  var(--color-purple) 0%,
  var(--color-accent) 38%,
  var(--color-brown) 50%,
  var(--color-copper) 62%,
  var(--color-success) 80%,
  var(--color-warning) 100%
);
```

---

## 7. Motion system — the opera, restrained

**GPU-only (`transform`/`opacity`).** All keyframes are defined in `src/index.css`
and **fully disabled** under `prefers-reduced-motion: reduce` (curtain/lift become a
≤200ms opacity fade; shimmer/flicker stop; glow goes static).

### Easing vocabulary (`:root`)

| Token            | Curve                      | Use                                                                      |
| ---------------- | -------------------------- | ------------------------------------------------------------------------ |
| `--ease-curtain` | `cubic-bezier(.7,0,.2,1)`  | The curtain parting — heavy in, heavy out.                               |
| `--ease-settle`  | `cubic-bezier(.16,1,.3,1)` | Entrances / rises — decelerate like a curtain settling. **The default.** |
| `--ease-exit`    | `cubic-bezier(.7,0,.84,0)` | Exits — accelerate away.                                                 |

Durations: `--dur-curtain: 700ms`, `--dur-settle: 520ms`, `--dur-glint: 220ms`.

### Named animation classes

| Class                  | Keyframe(s)        | Effect                                                                                               |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `.curtain-reveal`      | `curtain-rise`     | Content fades + rises `translateY(14px)→0` on mount. The default screen-enter.                       |
| `.curtain-stagger > *` | `curtain-rise`     | Children rise in sequence, 60ms apart (uses `--i` index var; falls back gracefully).                 |
| `.gold-shimmer`        | `gilt-sweep`       | Slow gold light travels across a gilt gradient/border (4s loop). For titles, primary borders.        |
| `.candle-flicker`      | `candle-flicker`   | Opacity `0.92↔1` micro-pulse on an irregular ~5s loop. For the footlight, heart-eyes, "lit" accents. |
| `.lift-press`          | — (transition)     | On `:active`, `translateY(1px) scale(.99)`; on hover the wine deepens. The button press.             |
| `.btn-catchlight`      | `catchlight-sweep` | A skewed gold highlight sweeps across a button on `:active`/`:hover` (500ms, once).                  |
| `.draw-rule`           | `rule-draw`        | A focus/active hairline draws in `scaleX(0)→1` from center (220ms). Focus states.                    |

**Existing keyframes that MUST stay intact** (used by Tree & Album features):
`tree-sway`, `tree-bloom`, `album-peel`, `album-foil-sheen`, plus the `.book-*`
classes. They are already inside the reduced-motion guard. Do not remove them.

---

## 8. Elevation & shadow system

| Token            | Value                                                              | Use                                                          |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `--shadow-catch` | `inset 0 1px 0 rgba(228,195,106,.18)`                              | Top gilt catch-light on any square panel.                    |
| `--shadow-loge`  | `0 24px 60px -20px rgba(0,0,0,.82)`                                | Deep theatrical drop — cards/sheets float in a pool of dark. |
| `--ring-candle`  | `0 0 0 1px rgba(228,195,106,.25), 0 0 24px -6px rgba(74,35,80,.5)` | Focus/glow ring — gold edge + soft purple candle halo.       |

Tailwind shadow scale: `shadow-loge`, `shadow-catch`, `shadow-candle` (ring).
Elevation ladder: `bg` (house) → `.velvet` (box) → `.velvet-2 + shadow-loge`
(lifted card) → sheet/modal adds `shadow-loge` + `.gilt-hairline`. Chiaroscuro:
light always falls from **above** (top catch-light) and **below** (footlight).

---

## 9. Signature moves (the soul — use them, don't dilute them)

1. **The Gilt Hairline Frame** — every card, sheet, and the app column wears
   exactly _one_ 1px gold-leaf border with square corners + top catch-light.
   Ornament comes from this single line. Minimal.
2. **The Curtain** — screen enter uses `.curtain-reveal`; major navigation can feel
   like Act I → Act II.
3. **Living Heart-Eyes** — the brand cat's negative-space hearts are filled with the
   gilt gradient and glow with a faint Imperial-Purple `.candle-flicker`. The one
   place her purple sings brightest.
4. **The Program Eyebrow** — section labels use `.eyebrow`: Cormorant small-caps,
   gold, centered, flanked by two short gilt hairlines. Bolshoi playbill heading.
5. **The Two-Color Seam (flag-free fusion)** — a 1px divider (`.seam`) that flows
   _her_ wine-purple-brown into _his_ olive-cream (with a copper glint), mediated by
   gold. Use on the couple/header and section breaks. The relationship as one
   gold-stitched line. **Never literal flags.**
6. **Sacred Snow** — `#FFFAFA` (the accent-fg) appears only in the logo heart-eyes
   and the single most affirmative moment on a screen.
7. **Marble Stage** — occasional ivory `.marble` panels with wine serif text invert
   the dark house for content-heavy moments, like the lit stage itself.

---

## 10. Feature signature guideline — how each feature gets its OWN identity

Every feature stays inside this language but earns a distinct character by choosing
**one accent**, **one motion**, and **one texture moment** from the kit. Do not
introduce new colors, fonts, or radii.

Recipe for a new feature:

1. **Pick a secondary accent** from the romantic layer that fits the feeling:
   - tenderness / love notes → **Imperial Purple** (`--color-purple`)
   - growth / "our tree" → **Olive Sash** (`--color-success`)
   - warmth / Chile / sunset moments → **Andes Copper** (`--color-copper`)
   - memory / album / archival → **Cordovan Brown** (`--color-brown`)
   - special / imperial / rare → **Lapis Box-Seat** (`--color-lapis`)
     The primary action stays **Bolshoi Wine**; the secondary accent tints glows,
     selected states, and the feature's eyebrow rule.
2. **Pick a signature motion** (one, not all): a feature may lean on
   `.gold-shimmer` (celebratory), `.candle-flicker` (intimate/alive), or the
   `.curtain-stagger` list-rise (reveal/gallery). Everything still enters with
   `.curtain-reveal`.
3. **Pick a texture moment**: most screens are `.velvet`; a feature may earn ONE
   `.marble` "lit stage" panel for its hero, or a `.footlight` behind its title.
4. **Always** wear the gilt hairline frame, square corners, the eyebrow, and respect
   spacing (§5) + reduced-motion (§7).

Examples (existing): **Our Tree** → success/olive accent, `tree-sway`/`tree-bloom`,
velvet base. **Pololini Album** → brown accent, `album-peel`/`album-foil`, a marble
page moment. **Know Me** → purple accent, `candle-flicker`, footlight hero.

---

## 11. Checklist before any screen ships

- [ ] All corners square (`radius 0`); ornament is the gilt hairline.
- [ ] Uses only token colors via Tailwind classes (no raw hex).
- [ ] Cormorant for titles/names, Manrope for everything else.
- [ ] Screen padding ≥ `1.75rem`; sections separated by `3rem`; not cramped.
- [ ] One gilt hairline frame per card; one eyebrow per section.
- [ ] Enters with `.curtain-reveal`; any looping motion is `transform`/`opacity`.
- [ ] Works and looks calm under `prefers-reduced-motion: reduce`.
- [ ] Snow white reserved for the heart / the single affirmative moment.
- [ ] The two-color seam used wherever "us / together" is expressed.
