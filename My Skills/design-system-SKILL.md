---
name: design-system
description: >
  Enforces strict adherence to a centralized Design System. Eliminates hardcoded styles, 
  magic numbers, and generic colors, ensuring visual consistency across the entire app.
  Trigger this skill whenever the user says "use the design system", "make this consistent", 
  "extract these styles", "refactor styles", or "build UI".
---

# Design System Architect Skill

## Mission
To build UI that relies 100% on a centralized, single-source-of-truth Design System. Zero magic numbers, zero rogue hex codes, zero inline styling exceptions. If a value isn't in the design system, it doesn't belong in the app.

---

## Core Principles

1. **The Single Source of Truth**
   - All colors, typography, spacing, and border radii must live in one central location (e.g., `constants/theme.ts` or `tailwind.config.js`).
2. **Absolute Ban on Hardcoding**
   - Never write `marginTop: 16` or `color: '#FF0000'` directly in a component. 
   - Always map values to tokens (e.g., `marginTop: SPACING.md`, `color: COLORS.error`).
3. **Reusable Atoms First**
   - Do not style basic elements over and over. Build core atomic components (`<Typography>`, `<Button>`, `<Card>`) that consume the design system, and use those to build screens.
4. **Theme Agnosticism**
   - Always structure tokens so they can easily support Dark Mode. Don't use literal names like `blackText`; use semantic names like `textPrimary`.

---

## Execution Workflow

### Phase 1: Define the Design Tokens (The Foundation)
If a design system does not exist yet, establish these core tokens:
- **Spacing:** Define an 8-point (or 4-point) grid. (e.g., `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`).
- **Typography:** Define font sizes, line heights, and families semantically. (e.g., `h1`, `h2`, `body`, `caption`).
- **Colors:** Define semantic roles. (e.g., `primary`, `background`, `surface`, `text`, `textMuted`, `border`, `error`).
- **Border Radii:** Standardize roundness. (e.g., `sm: 4`, `md: 8`, `lg: 16`, `pill: 9999`).

### Phase 2: The Audit & Extraction
1. Scan the target component(s) for any raw numbers in `padding`, `margin`, `width`, `height`, `borderRadius`, or `fontSize`.
2. Scan for any raw color strings (hex codes, rgb, or named colors like `'blue'`).
3. Extract these values into the central theme file if they represent a new global token, or flag them as violations.

### Phase 3: Replacement & Componentization
1. Replace all hardcoded values with references to the design system.
2. If you see multiple `<View>` components styled identically to look like cards, extract them into a `<Surface>` or `<Card>` component.
3. If you see `<Text>` components manually styled for headings, replace them with a `<Typography variant="h1">` component.

---

## Framework-Specific Rules

- **Vanilla React Native (`StyleSheet`):** Import your `COLORS` and `SPACING` constants at the top of every file. Never use inline `style={{}}` objects unless calculating a dynamic width based on screen dimensions.
- **NativeWind (Tailwind):** Configure all tokens strictly inside `tailwind.config.js`. **Ban the use of arbitrary values** like `w-[24px]` or `text-[#123456]` unless it is a mathematically unique one-off. Use `w-6` and `text-primary`.
- **UI Libraries (Tamagui, Restyle, Gluestack):** If the app uses a styling library, strictly use their token resolvers (e.g., `$space.4` or `variant` props) instead of bypassing the engine.

---

## Safety & Quality Checks
- [ ] Have all magic numbers (e.g., `12`, `16`, `24`) been replaced with Spacing tokens?
- [ ] Have all hardcoded colors been replaced with semantic Color tokens?
- [ ] If I change the `primary` color in the central theme file, does the entire app update flawlessly without missing any elements?
- [ ] Are we using reusable atomic components (like `<Typography>`) instead of re-styling raw `<Text>` elements?
