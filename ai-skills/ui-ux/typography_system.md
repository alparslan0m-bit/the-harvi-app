# Typography System: Fonts & Layout Hierarchy

This document defines the typography system, font family choices, loading cycles, and type scales of the Harvi application.

---

## 1. Font Philosophy & Selection

Harvi utilizes two premium Google Font families to create a clean, friendly, and legible interface:
1.  **Nunito (Nunito_700Bold, Nunito_800ExtraBold)**: A highly-rounded sans-serif font family. It is utilized exclusively for **headings, branding logs, paywall prices, and active screen titles** to establish a modern, approachable identity.
2.  **Inter (Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold)**: A functional geometric sans-serif designed for high legibility on mobile screens. It is utilized for **body text, inputs, dynamic statistics, quiz option items, and explanations**.

---

## 2. Dynamic Font Preloading Lifecycle

To prevent native apps from flickering or displaying raw, unstyled fallback fonts on boot (which ruins the premium feel), custom fonts are loaded in the root `_layout.tsx` before the splash screen is dismissed:

```typescript
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold, 
  useFonts 
} from "@expo-google-fonts/inter";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import * as SplashScreen from "expo-splash-screen";

// Lock splash screen visibility during boot
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Keep rendering null until fonts are completely loaded
  if (!fontsLoaded && !fontError) return null;

  return <RootLayoutNav />;
}
```

---

## 3. Standardized Font Scales

The typography scale enforces consistent readability constraints across components:

| Class Name | Font Family | Weight / Variable | Font Size | Line Height | Ideal Usage |
|---|---|---|---|---|---|
| **Branding Name** | `Nunito` | `800ExtraBold` | 34 | 44 | Root Logos & Headers |
| **Modal Header** | `Nunito` | `800ExtraBold` | 32 | 40 | Paywall Headers, Success screens |
| **Screen Title** | `Inter` | `700Bold` | 24 | 32 | standard Page titles |
| **Card Header** | `Inter` | `600SemiBold` | 18 | 24 | Module & Lecture cards |
| **Body Standard** | `Inter` | `400Regular` | 15 | 22 | Quiz options, explanations |
| **Body Muted** | `Inter` | `400Regular` | 13 | 18 | Small footnotes, input placeholders |
| **Navigation Label**| `Inter` | `700Bold` | 11 | 14 | Frosted tab labels |
