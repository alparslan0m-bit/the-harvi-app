import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export type ThemeColors = typeof colors.light & { radius: typeof colors.radius };

export function useColors(): ThemeColors {
  const { theme } = useTheme();
  const systemScheme = useColorScheme();

  const activeTheme = (theme === "harvi" ? "light" : theme) as "light" | "dark" | "pink";
  
  const palette = colors[activeTheme] || colors.light;

  return { ...palette, radius: colors.radius };
}

