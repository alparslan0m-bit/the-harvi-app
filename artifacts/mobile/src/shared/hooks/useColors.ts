import { COLORS as colors, THEME } from "@/src/shared/constants/theme";
import { useTheme } from "@/src/shared/store/themeStore";

export type ThemeColors = {
  [K in keyof typeof colors.light]: string;
} & { radius: number };

export function useColors(): ThemeColors {
  const { theme } = useTheme();

  const activeTheme = (theme === "harvi" ? "light" : theme) as "light" | "dark" | "pink";
  
  const palette = colors[activeTheme] || colors.light;

  return { ...palette, radius: THEME.radius };
}

