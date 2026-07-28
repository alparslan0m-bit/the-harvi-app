export const COLORS = {
  light: {
    text: "#3E2723",
    tint: "#0ea5e9",
    background: "#F4F0E6", // Warm beige from reference
    foreground: "#3E2723",
    card: "#ffffff",
    cardForeground: "#3E2723", // Dark text for pastel cards
    primary: "#3E2723",
    primaryForeground: "#ffffff",
    secondary: "#EBE4D5",
    secondaryForeground: "#3E2723",
    muted: "#EBE4D5",
    mutedForeground: "#737373",
    accent: "#FF8A7A", // Coral
    accentForeground: "#3E2723",
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
    text: "#4C1D95", // Deep elegant purple text
    tint: "#db2777",
    background: "#FFF0F5", // Soft lavender blush
    foreground: "#4C1D95",
    card: "#ffffff",
    cardForeground: "#4C1D95", // Dark elegant text on pastel cards
    primary: "#4C1D95",
    primaryForeground: "#ffffff",
    secondary: "#F3E8EE",
    secondaryForeground: "#4C1D95",
    muted: "#F3E8EE",
    mutedForeground: "#9D8BB0",
    accent: "#db2777",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#F3E8EE",
    input: "#F3E8EE",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#FFF0F5", // Blend with background
    headerForeground: "#4C1D95",
    headerSubtitle: "rgba(76,29,149,0.7)",
    cardColors: [
      "#FFB6C1", // Light Pink
      "#FFC0CB", // Pink
      "#E6E6FA", // Lavender
      "#D8BFD8", // Thistle
      "#FFDAB9", // Peach Puff
      "#FFF0F5", // Lavender Blush
    ],
  },
  mint: {
    text: "#1B5E20",
    tint: "#10b981",
    background: "#E8F5E9",
    foreground: "#1B5E20",
    card: "#ffffff",
    cardForeground: "#1B5E20",
    primary: "#1B5E20",
    primaryForeground: "#ffffff",
    secondary: "#C8E6C9",
    secondaryForeground: "#1B5E20",
    muted: "#C8E6C9",
    mutedForeground: "#81C784",
    accent: "#388E3C",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#C8E6C9",
    input: "#C8E6C9",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#E8F5E9",
    headerForeground: "#1B5E20",
    headerSubtitle: "rgba(27,94,32,0.7)",
    cardColors: [
      "#A5D6A7", // Light green
      "#81C784", // Green
      "#C8E6C9", // Very light green
      "#B2DFDB", // Teal light
      "#80CBC4", // Teal
      "#E8F5E9", // Mint base
    ],
  },
  ocean: {
    text: "#0F172A",
    tint: "#0ea5e9",
    background: "#E0F2FE", // Soft ice blue
    foreground: "#0F172A",
    card: "#ffffff",
    cardForeground: "#0F172A",
    primary: "#0F172A",
    primaryForeground: "#ffffff",
    secondary: "#BAE6FD",
    secondaryForeground: "#0F172A",
    muted: "#BAE6FD",
    mutedForeground: "#7DD3FC",
    accent: "#0284C7",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#BAE6FD",
    input: "#BAE6FD",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#E0F2FE",
    headerForeground: "#0F172A",
    headerSubtitle: "rgba(15,23,42,0.7)",
    cardColors: [
      "#7DD3FC", // Light sky blue
      "#38BDF8", // Sky blue
      "#BAE6FD", // Soft cyan
      "#A5F3FC", // Cyan
      "#67E8F9", // Bright cyan
      "#E0F2FE", // Ice base
    ],
  },
} as const;

export const THEME = {
  radius: 32,
} as const;
