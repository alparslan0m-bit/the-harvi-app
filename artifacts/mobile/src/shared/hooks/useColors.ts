/**
 * @file useColors.ts
 * @description Theme color consumption hook.
 * Maps active user theme selection (`harvi` / `pink`) from `useThemeStore` to the appropriate 
 * dynamic color palette tokens (backgrounds, borders, text, cards, feedback mint/coral families).
 */
import { COLORS as colors, THEME } from "@/src/shared/constants/theme";
import { useTheme } from "@/src/shared/store/themeStore";

/** Color triad structure for soft pastel card components */
export type PaletteFamily = { fill: string; solid: string; ink: string };

/** Strongly-typed mapped interface of active theme tokens and system metrics */
export type ThemeColors = {
  [K in keyof typeof colors.light]: (typeof colors.light)[K] extends readonly {
    fill: string;
    solid: string;
    ink: string;
  }[]
    ? readonly PaletteFamily[]
    : (typeof colors.light)[K] extends {
          fill: string;
          solid: string;
          ink: string;
        }
      ? PaletteFamily
      : (typeof colors.light)[K] extends readonly string[]
        ? readonly string[]
        : string;
} & { radius: number };

/**
 * Custom React hook retrieving the current active theme color palette and border radius tokens.
 * Automatically re-renders components whenever the active theme mode changes in `useThemeStore`.
 * 
 * @returns Active `ThemeColors` token object
 * 
 * @example
 * ```tsx
 * const colors = useColors();
 * return <View style={{ backgroundColor: colors.background }} />;
 * ```
 */
export function useColors(): ThemeColors {
  const { theme } = useTheme();

  const activeTheme = (theme === "harvi" ? "light" : theme) as "light" | "pink";

  const palette = colors[activeTheme] || colors.light;

  return { ...palette, radius: THEME.radius };
}
