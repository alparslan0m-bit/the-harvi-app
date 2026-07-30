# Design System: "Candy Pastel" Mobile UI

Derived from a set of reference app screenshots (task managers, fitness/health
trackers, finance, education, and lifestyle apps). This is the shared visual
language across all of them — use it as the single source of truth for any
new screen.

## 1. Design philosophy

- **Friendly, not corporate.** Rounded everything, soft colors, playful
  micro-copy ("Let's Go →", "You are all set!").
- **Color does the organizing.** Instead of borders/dividers, distinct
  pastel color fills separate cards, categories, and states (e.g. each
  subscription, each task tag, each day-of-week pill gets its own hue).
- **One hero number per screen.** Nearly every screen has a single oversized
  stat (a total, a score, a balance, a streak) that anchors the layout.
- **Flat + soft, never skeuomorphic.** Shadows are big, soft, and low-opacity
  — used for lift, not realism. No gradients on text, minimal gloss.
- **Chunky pill shapes everywhere.** Buttons, tags, nav bars, and date
  selectors are almost always fully rounded (radius ≥ height/2).

## 2. Color system

### 2.1 Base / neutral

| Token | Hex | Use |
|---|---|---|
| `bg.cream` | `#FAF6ED` | Primary screen background (warm, default) |
| `bg.paper` | `#FFF8EF` | Alt screen background, slightly lighter |
| `bg.mist` | `#EEF2F3` | Cool alt background (health/tech apps) |
| `surface.white` | `#FFFFFF` | Card surface on cream backgrounds |
| `ink.900` | `#1A1A1A` | Primary text / headlines |
| `ink.700` | `#3A3A3A` | Secondary headings |
| `ink.500` | `#6B7280` | Body/secondary text |
| `ink.300` | `#A3A3A3` | Placeholder / disabled text |
| `line.subtle` | `#ECE7DA` | Rare hairline dividers (avoid when possible) |

Pick **one** base background per app (cream is the most common in the
references) and stay consistent. Cards can go full-bleed color instead of
white+border — that's the signature move of this style.

### 2.2 Accent palette (the "candy" set)

Six soft, muted (never neon) hues, each with a light **fill** (for card
backgrounds) and a deeper **solid** (for icons, active states, small badges,
text-on-fill accents). Rotate through these to color-code categories, tags,
days, or list items — don't reuse the same hue for two different meanings on
one screen.

| Family | Fill (bg) | Solid (accent/icon) | Ink on fill |
|---|---|---|---|
| Coral | `#FFDCCB` | `#FF8A5B` | `#7A3A1E` |
| Sunshine | `#FFEFB0` | `#FFC93C` | `#6B4E00` |
| Mint | `#C9F0DE` | `#4FCB94` | `#0F5C3C` |
| Sky | `#CFE8FA` | `#5CB8F0` | `#134A6B` |
| Lavender | `#E3DBFA` | `#A88BF0` | `#3E2E70` |
| Rose | `#FBD6E4` | `#F787AE` | `#7A1F42` |

Optional 7th neutral-pop for "always available" CTAs: **Ink Black**
`#1A1A1A` on cream, or one accent solid promoted to "brand primary" per app
(e.g. Coral for a fitness app, Mint for a health app).

### 2.3 Usage rules

- A single card/pill uses **one fill + one solid**, never mixes two accent
  families.
- Text on a solid accent background is white or `ink.900` depending on
  contrast — check contrast, don't default to white.
- Status/semantic colors borrow from the palette instead of introducing new
  ones: success → Mint, warning → Sunshine, danger → Rose/Coral, info → Sky.

## 3. Typography

- **Display/Hero numbers** (big stat like "60", "8.8", "$180.60"): 40–56px,
  weight 800 (Extrabold), tight line-height (1.0–1.1).
- **Headlines / screen titles**: 22–28px, weight 700–800. Occasionally a
  serif is used for one emotional headline per app (e.g. an editorial-style
  greeting like "Sara, make things count") — if you use this, keep it to
  exactly one serif moment and everything else sans.
- **Card titles**: 16–18px, weight 700.
- **Body / descriptions**: 13–15px, weight 400–500, `ink.500`.
- **Labels / eyebrow text** (small caps-ish tags above a title, e.g.
  "NEXT EXPERIMENT"): 11–12px, weight 700, letterspacing +0.5–1px, uppercase.
- **Font family**: a rounded geometric sans for headings (Poppins, Baloo 2,
  Nunito, or Quicksand), and a clean neutral sans for body (Inter or system
  default). Avoid thin/light weights entirely — this style has no hairline
  type.

## 4. Spacing & radius scale

```
space: 4, 8, 12, 16, 20, 24, 32, 40   (px, use as multiples of 4)
radius:
  sm   = 12   (small chips, icon badges)
  md   = 20   (standard cards)
  lg   = 28   (hero cards, modals)
  pill = 999  (buttons, tags, nav bars, date selectors)
```

Screen padding: 20–24px horizontal. Card padding: 16–20px. Gap between
stacked cards: 12–16px.

## 5. Elevation

Soft shadow only, never hard borders for depth:

```
shadowColor: '#1A1A1A'
shadowOpacity: 0.06–0.10
shadowRadius: 16–24
shadowOffset: { width: 0, height: 8 }
elevation: 3   (Android)
```

Colored cards (a coral or mint fill card) usually skip shadow entirely and
rely on the color block itself for separation — reserve shadow for white
cards floating on a cream background, or for floating nav bars/FABs.

## 6. Core components

### 6.1 Stat Hero
Big number + label, optionally wrapped in a ring/donut chart. Ring uses 2–3
accent solids as segments (e.g. Sky/Lavender/Mint for
Upcoming/InProgress/Completed) with the number in the center.

### 6.2 Pastel Card
Full-bleed color card (fill token), radius `lg`, no border, holds a title,
optional 1–2 tag chips, optional avatar stack + meta row (comments/attachments
count with small icons) at the bottom.

### 6.3 Tag / Category Chip
Pill shape, radius `pill`, fill background from accent palette, solid-colored
or `ink.900` text, 6–10px vertical / 12–14px horizontal padding, 11–13px
semibold text. Used for category labels, filters, day selectors.

### 6.4 Primary Button
Full-width or content-width pill, radius `pill`, solid fill — either
`ink.900` (black) for the highest-emphasis default action, or the app's one
brand accent solid. Bold white/ink label, often with a trailing arrow "→".
Secondary buttons: same pill shape, `surface.white` or fill-tone background,
ink text.

### 6.5 Segmented / Filter Pills
Row of pill buttons (e.g. "Upcoming / In Progress / Completed"), one active
in solid brand color with white text, rest neutral gray fill.

### 6.6 Bottom Navigation
Floating pill or rounded-rectangle bar, inset from screen edges, dark
(`ink.900`) or white background, 4–5 icon slots, active icon on a small
solid accent-colored circular/pill highlight.

### 6.7 Avatar Stack
Overlapping circular avatars (24–32px, white 2px border), with a trailing
"+N" circle in an accent solid for overflow count.

### 6.8 Date / Day Selector
Horizontal row of rounded squares or circles, one per day, active day filled
solid (brand accent or `ink.900`) with white text, inactive days white/cream
with ink text.

### 6.9 List Row (colored by category)
Instead of plain white rows with icons, each row gets its own pastel fill
(rotating through the accent palette) to visually group by category/day —
seen in nutrition, subscription, and schedule lists.

### 6.10 Badge / Sticker Callout
Small rotated or free-floating pill/blob calling attention to something
("TONIGHT!", "JOIN NOW!", a streak number) — solid accent fill, bold white
or ink text, used sparingly (max 1 per screen) as a playful accent.

## 7. Iconography & illustration

- Icons: simple line icons (1.5–2px stroke) or duotone, sized 18–24px inside
  chips/nav, larger (32–40px) inside colored icon badges.
- Illustrations, when used, are flat-vector or soft-3D/claymorphic
  characters with rounded proportions — never photorealistic, never sharp
  edges.
- Emoji are used inline in headings occasionally ("Hi, Naeem! 👋") — fine to
  use sparingly for warmth.

## 8. Motion notes (for Expo/Reanimated)

- Buttons: scale to 0.97 on press, spring back (feels soft, not snappy).
- Cards entering a list: fade + slight translateY(12) stagger.
- Progress rings/bars: animate fill on mount (600–900ms, ease-out).
- Tab switches: crossfade content, no full-screen slide unless it's a stack
  push/pop.

## 9. Do / Don't

**Do**
- Give every card/section a distinct pastel identity when there are multiple
  categories on screen.
- Keep one hero stat per screen, large and unmissable.
- Use pill shapes for anything tappable that isn't a full card.
- Keep copy short, warm, and a little informal.

**Don't**
- Don't mix more than ~4 accent hues on a single screen — pick the ones
  relevant to that screen's categories.
- Don't use hard 1px gray borders as the primary separator — use color fill
  or spacing instead.
- Don't use saturated neon colors — everything is pastel/muted, even the
  "solid" accent tones are soft, not electric.
- Don't use more than one serif headline moment per app.
