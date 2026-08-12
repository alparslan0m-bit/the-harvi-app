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
    // Stat card palettes: [Quizzes, Questions, Avg Score, Best Score]
    statCardFamilies: [
      { fill: "#FFDCCB", solid: "#FF8A5B", ink: "#7A3A1E" }, // Coral
      { fill: "#CFE8FA", solid: "#5CB8F0", ink: "#134A6B" }, // Sky
      { fill: "#E3DBFA", solid: "#A88BF0", ink: "#3E2E70" }, // Lavender
      { fill: "#C9F0DE", solid: "#4FCB94", ink: "#0F5C3C" }, // Mint
    ],
    streakFamily: { fill: "#FFEFB0", solid: "#FFC93C", ink: "#6B4E00" }, // Sunshine
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
    // Stat card palettes: [Quizzes, Questions, Avg Score, Best Score]
    statCardFamilies: [
      { fill: "#FDDCC8", solid: "#F0A07A", ink: "#6B3A1E" }, // Warm Peach
      { fill: "#FFF3D6", solid: "#E0B05A", ink: "#5C4210" }, // Soft Gold — breaks the pink-purple monotony
      { fill: "#C9E8DE", solid: "#5DBCA3", ink: "#1A5C4A" }, // Soft Mint — complements pink, pops on pink bg
      { fill: "#D4C4E6", solid: "#9B7DC8", ink: "#3B1578" }, // Thistle — deeper purple anchor
    ],
    streakFamily: { fill: "#E8D6EF", solid: "#B07CC8", ink: "#4A1D6B" }, // Soft Mauve
  },
} as const;

export const THEME = {
  radius: 32,
} as const;
