# Asset Management: Icons, Tints & Responsive Graphics

This document defines directory rules, resolution setups, and pre-bundler asset scaling standards for the Harvi workspace.

---

## 1. Asset Directory Organization

All static assets (logos, splash assets, vectors, animations, static illustrations) must reside in a unified directory structure inside the mobile package:

```
artifacts/mobile/assets/
├── icon.png                 # Base high-res 1024x1024 app icon
├── adaptive-icon.png        # Android-specific adaptive icon
├── logo.png                 # Main vector or transparent brand mark
└── splash.png               # Centered splash screen graphic
```

---

## 2. Multi-Resolution Image Mappings

React Native selects the best asset resolution depending on the device's pixel density. For high-fidelity screens, assets should supply standard `@2x` and `@3x` variants:

```
assets/logo.png              # Standard density (1x)
assets/logo@2x.png           # Retinal screens (e.g. iPhone)
assets/logo@3x.png           # ultra-retinal screens
```

### Reference Pattern
```tsx
import { Image } from "react-native";

// Metro dynamically maps the correct resolution suffix based on the device's pixel ratio
<Image 
  source={require("@/assets/logo.png")} 
  style={{ width: 120, height: 40 }} 
/>
```

---

## 3. High-Quality Splash Configurations

The boot screen background must align perfectly with the background color of the landing screen to prevent jarring flashes on startup:

```json
// app.json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#0f172a" // Midnight Slate matching dark background
}
```

---

## 4. Asset Guidelines & Conventions

1.  **Vector Tints Preference**: Use vector images (SVGs) or icon fonts (Feather) for general icons rather than raster graphics (PNGs). Vector assets load faster, scale perfectly without blurring, and support dynamic color tinting based on themes.
2.  **Explicit Asset Declarations**: All static media assets must be registered in the project's compilation loop before distribution. Never use dynamic asset loading schemes like:
    ```typescript
    // AVOID: Metro cannot resolve dynamic strings at compile-time
    const path = `./assets/${name}.png`;
    const image = require(path);
    ```
