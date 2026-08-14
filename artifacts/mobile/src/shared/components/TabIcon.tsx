/**
 * @file TabIcon.tsx
 * @description Platform-aware tab bar icon component.
 * Transparently renders native Apple SF Symbols (`SymbolView`) on iOS, and vector glyphs (`Feather`) on Android & Web.
 */
import React from "react";
import { Platform } from "react-native";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";

/** Props for the platform-adaptive TabIcon component */
interface TabIconProps {
  /** Feather vector icon name (used on Android & Web) */
  name: keyof typeof Feather.glyphMap;
  /** Apple SF Symbol name (used on iOS) */
  sfName: string;
  /** Active tint color */
  color: string;
  /** Base icon size in pixels (defaults to 22) */
  size?: number;
}

/**
 * Renders a platform-native tab bar icon (SF Symbol on iOS, Feather glyph on Android/Web).
 * 
 * @param props - TabIconProps
 * @returns Platform-optimized icon component
 */
export function TabIcon({ name, sfName, color, size = 22 }: TabIconProps) {
  if (Platform.OS === "ios") {
    // Type safe component prop typecast instead of as any
    return (
      <SymbolView
        name={sfName as React.ComponentProps<typeof SymbolView>["name"]}
        tintColor={color}
        size={size + 2}
      />
    );
  }
  return <Feather name={name} size={size} color={color} />;
}
