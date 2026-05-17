# Font Strategy: Preloading & Font Scaling

This document defines the font preloading, caching, and layout mapping strategies of the Harvi application.

---

## 1. preloading Custom Google Fonts

To ensure fonts are available on the very first screen render pass, Harvi leverages `@expo-google-fonts` packages and registers their loading status prior to app boot:

```typescript
import { 
  Inter_400Regular, 
  Inter_600SemiBold, 
  useFonts 
} from "@expo-google-fonts/inter";
import { Nunito_700Bold } from "@expo-google-fonts/nunito";

export function useAppFonts() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Nunito_700Bold,
  });

  return { loaded, error };
}
```

---

## 2. Dynamic Font Scaling (Accessibility Guard)

By default, users can adjust their operating system's font scale in the device accessibility settings. In medical applications, high font scaling values can overflow container elements and break grids.

To prevent layout breaks, the system sets standard `maxFontSizeMultiplier` limits on all `<Text>` elements:

```tsx
// components/ui/Text.tsx
import React from "react";
import { Text as RNText, TextProps } from "react-native";

export function Text({ style, children, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      // Prevents fonts from growing past 1.35x their base style size
      maxFontSizeMultiplier={1.35} 
      style={style}
    >
      {children}
    </RNText>
  );
}
```

---

## 3. Font System Guidelines

1.  **Strict Font Loading Gates**: Always block navigation entry if `fontsLoaded` resolves as `false` and `fontError` is `null`. This prevents the application from showing unstyled fallback fonts on boot.
2.  **Explicit FontFamily Declarations**: Always pair `fontFamily` with correct weight tokens. Never set `fontWeight: "bold"` when using an imported Google Font like `Nunito_700Bold` — setting both causes Android layout layers to render double-bold or crash.
