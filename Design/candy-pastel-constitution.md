# The Candy Pastel Constitution
### The governing design law for all mobile apps built in this style

This document is the supreme source of truth for visual and interaction
decisions across every app built in this system. Where any component,
mockup, or piece of code conflicts with this constitution, the constitution
wins. Amendments are only made deliberately (Article X), never by accident
or one-off exception.

---

## Preamble

We build interfaces that feel warm, tactile, and a little playful —
never cold, corporate, or sterile. Color organizes the screen instead of
lines. Shape is soft everywhere. One number tells the truth at a glance.
Every screen should look like it belongs to the same family of apps, even
across completely different products.

---

## Article I — Color

**§1.1** The base background of every screen is warm cream (`#FAF6ED`),
or one of its sanctioned alternates (`#FFF8EF`, `#EEF2F3`). One background
choice per app, used consistently.

**§1.2** Cards are colored by full-bleed pastel fill, not by white
background plus a border. Color is the primary structural device.

**§1.3** All color originates from a single six-hue accent family:
**Coral, Sunshine, Mint, Sky, Lavender, Rose.** No hue outside this family
may be introduced without amending this constitution (Article X).

**§1.4** Every accent hue has exactly two legal shades: a **fill** (light,
for backgrounds) and a **solid** (deeper, for icons, active states, and
text-on-fill). No third shade may be invented ad hoc.

**§1.5** No accent color may be rendered at full/neon saturation. Pastel,
muted tones only — this is non-negotiable.

**§1.6** No more than four accent hues may appear on a single screen at
once. Screens with more categories than that must group or paginate.

**§1.7** A given category, tag, or entity is assigned one hue and keeps it
everywhere it appears in the app. Color assignment is deterministic
(`accentFor(key)`), never random per render.

**§1.8** Semantic states borrow from the existing palette rather than
introducing new colors: success → Mint, warning → Sunshine, danger →
Rose/Coral, info → Sky.

**§1.9** Text on a solid accent background must be checked for contrast —
default to `ink.900` or white, whichever passes, never assumed.

---

## Article II — Shape

**§2.1** Anything tappable that is not a full card (buttons, tags, chips,
nav bars, date/day selectors) is rendered fully pill-shaped
(radius ≥ height ÷ 2).

**§2.2** Cards use large corner radii (20–28px). Sharp or barely-rounded
corners are forbidden.

**§2.3** Hard 1px gray dividing lines are forbidden as a primary separator.
Separation is achieved through color fill, whitespace, or shadow — never
a stroke.

**§2.4** The bottom navigation bar is a floating, inset, rounded
bar or pill — never a flush, square, edge-to-edge bar.

---

## Article III — Elevation & Depth

**§3.1** Shadows are soft, large-blur, low-opacity (`opacity 0.06–0.10`,
`radius 16–24`, small vertical offset). Hard, tight shadows are forbidden.

**§3.2** Colored (pastel-fill) cards generally carry no shadow — the color
block itself provides separation. Shadow is reserved for white surfaces,
floating nav bars, and FABs.

**§3.3** No gradients on text. Gradients on backgrounds are permitted only
as a rare, deliberate accent — never the default treatment.

---

## Article IV — Typography

**§4.1** Every screen carries exactly one **hero number** — a large,
bold statistic that anchors the layout (a total, score, streak, balance).

**§4.2** Headings and hero numbers use a bold (700–800 weight), rounded
geometric sans typeface (Poppins, Baloo 2, Nunito, or Quicksand).

**§4.3** Body text uses a clean neutral sans (Inter or system default),
medium weight, 13–15px.

**§4.4** Thin or light font weights are forbidden anywhere in the system.
The lightest permitted weight is medium (500).

**§4.5** Eyebrow/label text (small text above a title) is uppercase, bold,
letterspaced (+0.5–1px), 11–12px.

**§4.6** At most one serif or editorial-style headline moment is permitted
per app, used only for an emotional/greeting statement. Every other
heading remains sans-serif.

---

## Article V — Core Components

The following are the only sanctioned recurring UI patterns. New
components should extend these, not invent parallel systems.

**§5.1 Pastel Card** — full-bleed accent fill, radius `lg` (28), holds a
title, optional description, optional chips, optional avatar/meta row.

**§5.2 Chip / Tag** — pill shape, accent fill background, bold small text
in the accent's ink or solid tone.

**§5.3 Primary Button** — full pill shape, solid fill (`ink.900` black by
default, or the app's one designated brand accent), bold white/ink label.

**§5.4 Stat Ring** — circular/donut progress indicator with 2–3
accent-solid segments and the hero number centered inside it.

**§5.5 Bottom Navigation** — floating pill/rounded bar, dark or white
background, active icon highlighted with a small solid-accent pill/circle.

**§5.6 Avatar Stack** — overlapping circular avatars with white borders,
trailing "+N" overflow bubble in an accent solid.

**§5.7 Date/Day Selector** — horizontal row of rounded squares/circles,
active day filled solid, inactive days neutral.

**§5.8 Colored List Row** — list items tinted by category/day using the
accent fill instead of a plain white row with only an icon for context.

**§5.9 Sticker Badge** — a small free-floating or slightly rotated pill
callout (e.g. "TONIGHT!") in a solid accent — permitted at most once per
screen, used only for genuine emphasis.

---

## Article VI — Layout & Spacing

**§6.1** All spacing derives from a 4px base scale:
`4, 8, 12, 16, 20, 24, 32, 40`. No arbitrary spacing values.

**§6.2** Screen horizontal padding is 20–24px. Card internal padding is
16–20px. Vertical gap between stacked cards is 12–16px.

**§6.3** Radii are limited to four legal values: `sm 12`, `md 20`, `lg 28`,
`pill 999`. No other radius value may be used.

---

## Article VII — Iconography & Illustration

**§7.1** Icons are simple line (1.5–2px stroke) or duotone style,
18–24px inline, 32–40px inside icon badges. No skeuomorphic or
photorealistic icons.

**§7.2** Illustrations, where used, are flat-vector or soft/claymorphic
characters with rounded proportions. Sharp-edged or photorealistic
illustration is forbidden.

**§7.3** Inline emoji in headings are permitted sparingly for warmth
(e.g. a greeting), not as a general decoration technique.

---

## Article VIII — Motion

**§8.1** Interactive elements (buttons) scale down subtly on press
(~0.97) and spring back — motion is soft, never sharp or linear.

**§8.2** List items entering a screen fade in with a slight upward
translate and stagger — not an abrupt appear or a hard slide.

**§8.3** Progress bars and rings animate their fill on mount
(600–900ms, ease-out) rather than appearing instantly filled.

**§8.4** Tab content switches crossfade; only stack navigation (push/pop)
may slide.

---

## Article IX — Voice & Copy

**§9.1** Microcopy is short, warm, and mildly informal
("Let's Go →", "You are all set!").

**§9.2** Buttons prefer active, encouraging verbs over generic labels
("Start a Club!" over "Submit").

**§9.3** The tone is friendly and human, never corporate or terse.

---

## Article X — Amendments

**§10.1** This constitution may only be amended deliberately — e.g. the
user supplies new reference screenshots and asks for the style to evolve.

**§10.2** Amendments update `references/design-system.md` and
`assets/theme.ts` together, in the same change, so tokens and law never
drift apart.

**§10.3** No article may be silently violated "just this once" inside
implementation code. If an exception is truly needed, it must be proposed
as an amendment here first.

---

## Ratification

By building within this system, every screen, component, and app agrees
to be bound by the articles above. When in doubt, re-read the Preamble:
warm, tactile, playful, color-organized, one truth at a glance.
