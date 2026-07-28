export const COLORS = {
  light: {
    text: "#3E2723",
    tint: "#0ea5e9",
    background: "#F4F0E6", // Warm beige from reference
    foreground: "#3E2723",
    card: "#ffffff",
    cardForeground: "#2D2319", // Unified warm dark for all card text
    primary: "#3E2723",
    primaryForeground: "#ffffff",
    secondary: "#EBE4D5",
    secondaryForeground: "#3E2723",
    muted: "#EBE4D5",
    mutedForeground: "#737373",
    accent: "#FF8A7A", // Coral
    accentForeground: "#ffffff",
    destructive: "#FF6B57",
    destructiveForeground: "#ffffff",
    border: "#EBE4D5",
    input: "#EBE4D5",
    success: "#8CD6C1",
    successForeground: "#3E2723",
    warning: "#F5E16E",
    warningForeground: "#3E2723",
    headerBackground: "#F4F0E6", // Blend with background
    headerForeground: "#3E2723",
    headerSubtitle: "rgba(62,39,35,0.7)",
    cardColors: [
      "#99C7FF", // Soft Blue
      "#FF8A7A", // Coral
      "#F5E16E", // Pastel Mustard Yellow
      "#8CD6C1", // Mint Green
      "#B4CBFF", // Periwinkle
      "#FFB86B", // Soft Orange
    ],
  },
  pink: {
    text: "#3B1578", // Slightly darker purple for better contrast
    tint: "#db2777",
    background: "#FDF2F8", // Slightly deeper, less washed-out
    foreground: "#3B1578",
    card: "#ffffff",
    cardForeground: "#2D2319", // Unified warm dark for all card text
    primary: "#3B1578",
    primaryForeground: "#ffffff",
    secondary: "#F5EDF2",
    secondaryForeground: "#3B1578",
    muted: "#F5EDF2",
    mutedForeground: "#8B7FA0", // Less purple, more neutral
    accent: "#db2777",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#F5EDF2",
    input: "#F5EDF2",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#FDF2F8",
    headerForeground: "#3B1578",
    headerSubtitle: "rgba(59,21,120,0.7)",
    cardColors: [
      "#F9B4C4", // Rich Pink
      "#FCBDD4", // Rose
      "#DDD6F3", // Lavender
      "#D4C4E6", // Thistle
      "#FDDCC8", // Warm Peach
      "#FDF2F8", // Blush
    ],
  },
  mint: {
    text: "#1A4D2E", // Slightly deeper, less saturated green
    tint: "#10b981",
    background: "#F0F7F4", // Desaturated — less clinical, more sophisticated
    foreground: "#1A4D2E",
    card: "#ffffff",
    cardForeground: "#2D2319", // Unified warm dark for all card text
    primary: "#1A4D2E",
    primaryForeground: "#ffffff",
    secondary: "#DAE8DC", // Desaturated
    secondaryForeground: "#1A4D2E",
    muted: "#DAE8DC",
    mutedForeground: "#7A9E82", // Less saturated — not bright green
    accent: "#2E9E5C", // Brighter emerald — less muddy
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#DAE8DC",
    input: "#DAE8DC",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#F0F7F4",
    headerForeground: "#1A4D2E",
    headerSubtitle: "rgba(26,77,46,0.7)",
    cardColors: [
      "#A8D5B5", // Sage green
      "#8EC59F", // Soft green
      "#CDDDD0", // Muted sage
      "#B0D4CF", // Teal mist
      "#8DBFB8", // Eucalyptus
      "#F0F7F4", // Mint base
    ],
  },
  ocean: {
    text: "#0F172A",
    tint: "#0ea5e9",
    background: "#EFF6FF", // Warmer/lighter blue, less icy
    foreground: "#0F172A",
    card: "#ffffff",
    cardForeground: "#2D2319", // Unified warm dark for all card text
    primary: "#0F172A",
    primaryForeground: "#ffffff",
    secondary: "#D6E8F5", // Desaturated, warmer
    secondaryForeground: "#0F172A",
    muted: "#D6E8F5",
    mutedForeground: "#7B97B0", // Desaturated — was sky blue, now readable
    accent: "#0284C7",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#D6E8F5",
    input: "#D6E8F5",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#EFF6FF",
    headerForeground: "#0F172A",
    headerSubtitle: "rgba(15,23,42,0.7)",
    cardColors: [
      "#93C5E8", // Soft sky
      "#6BAED6", // Steel blue
      "#BDDAF0", // Pale azure
      "#AAE0F0", // Cyan mist
      "#7DD4EB", // Bright cyan
      "#EFF6FF", // Ice base
    ],
  },
} as const;

export const THEME = {
  radius: 32,
} as const;
