---
name: ui-polish
description: >
  Polish and refine the User Interface to make it look premium, modern, and beautiful.
  Trigger this skill whenever the user asks to "make it look better", "polish the UI", "modernize the design",
  "add some juice", or "fix the styling". 
  This skill focuses on typography, spacing, colors, and micro-interactions for React Native/Expo or general UI.
---

# UI Polish Skill

## Mission
Transform functional but basic UI into a premium, polished, and state-of-the-art visual experience. The user should be wowed by the final result.

---

## Key Design Principles

1. **Modern Typography**
   - Use clean, modern fonts (e.g., Inter, Roboto, Outfit, SF Pro).
   - Establish clear visual hierarchy using font weights (e.g., bold for titles, medium for buttons, regular for body text).
   - Ensure proper line height and readable contrast ratios.

2. **Harmonious Spacing & Alignment**
   - Strictly follow an 8pt (or 4pt) grid system for padding, margins, and gaps.
   - Group related elements closer together, and add ample whitespace between distinct sections.
   - Maintain perfect alignment (flexbox, center alignment).

3. **Premium Color Palette**
   - Avoid harsh generic colors (e.g., `#FF0000` or `'blue'`). Use tailored, subtle scales.
   - Implement seamless Dark Mode support.
   - Use vibrant yet harmonious accent colors to guide the user's attention.

4. **Depth & Texture**
   - Use subtle shadows (`shadow-sm`, `shadow-md`) instead of harsh borders where appropriate.
   - Incorporate glassmorphism (backdrop-blur) or subtle background layers to separate content without cluttering.
   - Use border radii consistently (e.g., rounded-xl for cards, rounded-lg for buttons).

5. **Micro-interactions & Animations**
   - Add visual feedback for user actions.
   - Use React Native Reanimated or standard Animated for smooth transitions.
   - Add active opacities to buttons/touchables (`activeOpacity={0.7}`).

---

## Execution Workflow

1. **Analyze Current State**
   - Identify visual inconsistencies, cramped layouts, poor contrast, or generic styling.
2. **Establish the Baseline**
   - Ensure a consistent theme/constants file (colors, spacing) is being utilized instead of inline hardcoded values.
3. **Enhance the Layout**
   - Apply the 8pt grid system.
   - Round sharp corners appropriately.
   - Add subtle shadows or borders for depth.
4. **Refine Typography & Colors**
   - Adjust font sizes and weights.
   - Swap primary generic colors for a polished, curated palette.
5. **Add Juice (Interactions)**
   - Introduce subtle animations for state changes (e.g., opening a modal, expanding a card, pressing a button).

---

## Component "Before & After" Examples

### Basic Button (Avoid)
```jsx
<TouchableOpacity style={{ backgroundColor: 'blue', padding: 10 }}>
  <Text style={{ color: 'white' }}>Submit</Text>
</TouchableOpacity>
```

### Premium Button (Goal)
```jsx
<TouchableOpacity 
  activeOpacity={0.8}
  style={{
    backgroundColor: COLORS.primary, // e.g., '#4F46E5'
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <Text style={{ 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600',
    letterSpacing: 0.5 
  }}>
    Submit
  </Text>
</TouchableOpacity>
```

---

## Safety & Quality Checks
- [ ] Does the UI look premium and modern?
- [ ] Is there sufficient whitespace and breathing room?
- [ ] Are interactions and feedback (like touchable active states) present?
- [ ] Are colors harmonious and accessible?
- [ ] Have you preserved all functional logic while updating the presentation?
