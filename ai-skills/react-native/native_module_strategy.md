# Native Module Strategy: SF Symbols, Haptics & Keyboards

This document details the strategies for using native system integrations (iOS SF Symbols, Haptics, and Keyboard controllers) inside the Harvi mobile workspace.

---

## 1. Native SF Symbols vs. Vector Icons

Harvi elevates the iOS user experience by displaying **Apple SF Symbols** (using `expo-symbols`) when running on iOS, creating a native Apple feel. For Android and Web environments, the system falls back to standard Feather vector icons:

```tsx
// components/TabIcon.tsx
import React from "react";
import { Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Symbols from "expo-symbols"; 

export interface TabIconProps {
  name: keyof typeof Feather.glyphMap;
  sfName: string;
  color: string;
  size?: number;
}

export function TabIcon({ name, sfName, color, size = 24 }: TabIconProps) {
  if (Platform.OS === "ios" && sfName) {
    return (
      <Symbols.SymbolView 
        name={sfName} 
        size={size} 
        tintColor={color} 
        fallback={<Feather name={name} size={size} color={color} />}
      />
    );
  }

  return <Feather name={name} size={size} color={color} />;
}
```

---

## 2. Dynamic Physical Haptics Triggering

To make virtual operations feel physical, the app integrates haptic responses on buttons and success/error notifications using `expo-haptics`:

```typescript
import * as Haptics from "expo-haptics";

export async function triggerHapticSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Graceful fallback for non-haptic environments (e.g. Android Emulators)
  }
}

export async function triggerHapticError() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

export async function triggerHapticSelection() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}
```

---

## 3. Keyboard Controller offsets Layouts

Standard React Native `KeyboardAvoidingView` transitions can look jumpy. Harvi uses `react-native-keyboard-controller` to handle keyboard appearances smoothly:

### Registration (`app/_layout.tsx`)
```tsx
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <RootLayoutNav />
    </KeyboardProvider>
  );
}
```

---

## 4. Native Integration Rules

1.  **Always catch Native API Errors**: Modules like `Haptics` and `SecureStore` fail silently inside emulators or unsupported systems. Always wrap their calls in `try/catch` scopes or `.catch()` guards to prevent the application from throwing unhandled exceptions.
2.  **Explicit SF Symbols Fallbacks**: Provide a high-quality Feather equivalent for every SF Symbol icon declared in navigation layers. This ensures clean, consistent visual designs on Android and Web layouts.
