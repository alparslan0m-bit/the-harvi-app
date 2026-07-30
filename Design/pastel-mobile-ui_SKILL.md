---
name: pastel-mobile-ui
description: Design and build React Native / Expo mobile app screens in the user's preferred "Candy Pastel" visual style — soft multi-color pastel cards, chunky pill buttons/tags, big hero stat numbers, floating rounded bottom nav, rounded-geometric bold typography. ALWAYS use this skill whenever the user asks to design, build, style, mock up, or add a screen/component to a React Native or Expo mobile app, or asks for a "design system", UI style, theme, color palette, or component for a mobile app — even if they don't explicitly name the style. This is the user's default/house style for all their mobile apps unless they explicitly ask for something different.
---

# Pastel Mobile UI (React Native / Expo)

This skill encodes the user's personal mobile-app design system, derived
from a curated set of reference screenshots they like (task managers,
health/fitness trackers, finance, education, lifestyle apps). Use it any
time they're designing or building a screen, component, or full app in
React Native / Expo — not just when they explicitly ask for "the style."

## Workflow

1. **Read the full design system** in `references/design-system.md` before
   designing or writing any UI code. It covers colors, typography, spacing,
   radius, shadows, and the 10 core recurring components (pastel cards,
   chips, pill buttons, stat rings, bottom nav, avatar stacks, date
   selectors, colored list rows, badges/stickers).
2. **Set up tokens first.** Copy `assets/theme.ts` into the project (e.g.
   `src/theme/theme.ts`) rather than inlining hex values ad hoc. Every
   screen should import colors/spacing/radius/typography from this one
   file so the whole app stays visually consistent.
3. **Check `references/component-recipes.md`** for ready patterns
   (PastelCard, Chip, PrimaryButton, Stat Ring, BottomNav, AvatarStack)
   before building a component from scratch — adapt these rather than
   reinventing the shape/radius/shadow conventions.
4. **Assign accent colors deliberately.** Use `accentFor(key)` (in
   `theme.ts`) to get a stable pastel hue per category/tag/day so the same
   item always renders in the same color across the app, or hand-pick
   accents when a screen has a fixed small set of categories worth
   curating (e.g. always Mint for "completed", Coral for "urgent").
5. **Build, then sanity-check against the "Do / Don't" list** at the end of
   `design-system.md` (max ~4 accents per screen, no hard gray borders, one
   hero stat, pill shapes for anything tappable, no neon).

## Key style cheatsheet (see design-system.md for full detail)

- **Background**: warm cream (`#FAF6ED`) by default.
- **Cards**: full-bleed pastel color fill, radius 28, no border, no/soft
  shadow.
- **Buttons/tags/nav**: fully pill-shaped (radius 999).
- **Type**: bold rounded-geometric sans for headings/numbers (Poppins,
  Baloo 2, Nunito, or Quicksand), no light/thin weights.
- **One big hero number** per main screen (a total, score, streak, balance).
- **6-hue rotating accent palette**: coral, sunshine, mint, sky, lavender,
  rose — each with a light "fill" and a deeper "solid" variant.

## When the user shares new reference screenshots

If the user attaches more inspiration images later and asks to refine the
style, update `references/design-system.md` in place (don't create a
parallel doc) — treat it as the living source of truth for this design
system, and keep `assets/theme.ts` in sync with any palette/token changes.

## Libraries this style pairs well with

- `react-native-svg` for stat rings / donut charts
- `react-native-reanimated` for the soft press/spring motion described in
  the design system's motion notes
- `expo-linear-gradient` only sparingly — this style is mostly flat color,
  not gradient-heavy
- NativeWind is fine if the user prefers utility classes — just map the
  same token values into `tailwind.config.js` `theme.extend.colors` /
  `borderRadius` instead of hardcoding a second palette
