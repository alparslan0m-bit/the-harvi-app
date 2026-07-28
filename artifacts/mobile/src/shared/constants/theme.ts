export const COLORS = {
  light: {
    text: "#0a0a0a",
    tint: "#0ea5e9",
    background: "#f8fafc", // Softer white
    foreground: "#0a0a0a",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    primary: "#0284c7",
    primaryForeground: "#ffffff",
    secondary: "#f1f5f9",
    secondaryForeground: "#1a1a1a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    accent: "#0ea5e9",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#e2e8f0",
    input: "#e2e8f0",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#0284c7", // Deeper sky blue for comfort
    headerForeground: "#ffffff",
    headerSubtitle: "rgba(255,255,255,0.72)",
    cardColors: [
      "#2563eb", // Blue 600
      "#0d9488", // Teal 600
      "#7c3aed", // Violet 600
      "#d97706", // Amber 600
      "#e11d48", // Rose 600
      "#059669", // Emerald 600
    ],
  },
  dark: {
    text: "#F1F5F9",
    tint: "#38bdf8",
    background: "#0f172a", // Midnight Slate
    foreground: "#FFFFFF",
    card: "#1e293b", // Slate card
    cardForeground: "#FFFFFF",
    primary: "#38bdf8",
    primaryForeground: "#ffffff",
    secondary: "#334155",
    secondaryForeground: "#F1F5F9",
    muted: "#1e293b",
    mutedForeground: "#94a3b8",
    accent: "#38bdf8",
    accentForeground: "#0f172a",
    destructive: "#f43f5e",
    destructiveForeground: "#ffffff",
    border: "#334155",
    input: "#334155",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#1e293b",
    headerForeground: "#ffffff",
    headerSubtitle: "rgba(56,189,248,0.8)",
    cardColors: [
      "#1d4ed8", // Blue 700
      "#0f766e", // Teal 700
      "#6d28d9", // Violet 700
      "#b45309", // Amber 700
      "#be123c", // Rose 700
      "#047857", // Emerald 700
    ],
  },
  pink: {
    text: "#27272a",
    tint: "#db2777",
    background: "#fff1f2",
    foreground: "#831843",
    card: "#ffffff",
    cardForeground: "#27272a",
    primary: "#be185d",
    primaryForeground: "#ffffff",
    secondary: "#fce7f3",
    secondaryForeground: "#be185d",
    muted: "#fdf2f8",
    mutedForeground: "#be185d",
    accent: "#db2777",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#fbcfe8",
    input: "#fbcfe8",
    success: "#10b981",
    successForeground: "#ffffff",
    warning: "#f59e0b",
    warningForeground: "#ffffff",
    headerBackground: "#be185d", // Deeper pink for comfort
    headerForeground: "#ffffff",
    headerSubtitle: "rgba(255,255,255,0.72)",
    cardColors: [
      "#be185d", // Pink 700
      "#9f1239", // Rose 700
      "#86198f", // Fuchsia 800
      "#6b21a8", // Purple 800
      "#5b21b6", // Violet 800
      "#3730a3", // Indigo 800
    ],
  },
} as const;

export const THEME = {
  radius: 24,
} as const;
