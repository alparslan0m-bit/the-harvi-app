# Design System: Layout & Premium Visual Polish

This document defines the spacing tokens, border-radius keys, rim-lighting effects, and shadow styling standards that establish the premium visual aesthetic of the Harvi application.

---

## 1. Core Layout Tokens

The design system maintains a clean layout structure by enforcing consistent spacing increments:

```typescript
export const SPACING = {
  xs: 4,    // Tiny label margins
  sm: 8,    // Inner component gutters
  md: 16,   // Standard screen paddings & card gaps
  lg: 24,   // Large container separations
  xl: 32,   // Header gutters
  xxl: 48   // Deep top-pad headers
};
```

---

## 2. Rounded Borders & Consistent Radii

Harvi avoids generic rectangular boundaries in favor of highly-rounded, premium curves:

```typescript
export const RADIUS = {
  sm: 8,      // Standard input fields
  md: 14,     // Buttons and basic cards
  lg: 20,     // Paywall sheets and modal containers
  xl: 24      // Maximum rounded curve token (defined as colors.radius in colors.ts)
};
```

---

## 3. Premium Rim-Lighting Effect

To create a state-of-the-art interface that feels layered and alive, Harvi implements **Rim-Lighting** on cards and absolute overlays (like bottom tab bars). This is a very thin border placed at the top edge of dark or transparent elements to simulate ambient light reflection.

### Rim-Light Code Pattern
```tsx
// Inside any absolute card overlay or bottom tab bar
<View style={StyleSheet.absoluteFill}>
  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
  
  {/* Rim-Light Border */}
  <View 
    style={{
      height: 1.5,
      backgroundColor: theme === "dark" 
        ? "rgba(255, 255, 255, 0.08)" // Soft white ambient glow in dark mode
        : "rgba(0, 0, 0, 0.03)",      // Soft dark ambient drop in light mode
      width: "100%",
      position: "absolute",
      top: 0,
    }} 
  />
</View>
```

---

## 4. Drop Shadows & Depth Elevations

Shadows inside Harvi are designed to be extremely soft and subtle, avoiding the harsh black shadows common in basic apps:

```typescript
export const SHADOWS = {
  // Soft, wide-spread light blue glow (perfect for active buttons or branding elements)
  primaryGlow: {
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  
  // Soft, subtle shadow for float cards
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  }
};
```
