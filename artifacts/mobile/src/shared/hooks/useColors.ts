import { COLORS as colors, THEME } from "@/src/shared/constants/theme";
import { useTheme } from "@/src/shared/store/themeStore";

export type PaletteFamily = { fill: string; solid: string; ink: string };

export type ThemeColors = {
  [K in keyof typeof colors.light]: typeof colors.light[K] extends readonly { fill: string; solid: string; ink: string }[]
    ? readonly PaletteFamily[]
    : typeof colors.light[K] extends { fill: string; solid: string; ink: string }
    ? PaletteFamily
    : typeof colors.light[K] extends readonly string[]
    ? readonly string[]
    : string;
} & { radius: number };

export function useColors(): ThemeColors {
  const theme = useTheme((s) => s.theme);

  const activeTheme = (theme === "harvi" ? "light" : theme) as "light" | "pink";
  
  const palette = colors[activeTheme] || colors.light;

  return { ...palette, radius: THEME.radius };
}

