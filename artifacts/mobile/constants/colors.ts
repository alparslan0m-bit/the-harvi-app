const colors = {
  light: {
    text: "#0a0a0a",
    tint: "#0ea5e9",
    background: "#ffffff",
    foreground: "#0a0a0a",
    card: "#f8fafc",
    cardForeground: "#0a0a0a",
    primary: "#0ea5e9",
    primaryForeground: "#ffffff",
    secondary: "#f1f5f9",
    secondaryForeground: "#1a1a1a",
    muted: "#f1f5f9",
    mutedForeground: "#94a3b8",
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
  },
  dark: {
    text: "#F2F2F7", // Soft white to prevent astigmatism blur
    tint: "#38bdf8", // Glowing sky blue
    background: "#000000", // True OLED Black
    foreground: "#FFFFFF", // Crisp white
    card: "#121212", // Clean, subtle elevation
    cardForeground: "#FFFFFF",
    primary: "#0ea5e9", // Brand sky blue
    primaryForeground: "#ffffff",
    secondary: "#1C1C1E", // Native iOS secondary surface
    secondaryForeground: "#EBEBF5",
    muted: "#1C1C1E", // Native iOS tertiary
    mutedForeground: "#8E8E93", // Native iOS muted text
    accent: "#38bdf8",
    accentForeground: "#000000",
    destructive: "#FF453A", // Vibrant neon red
    destructiveForeground: "#ffffff",
    border: "#2C2C2E", // Barely-there crisp lines
    input: "#2C2C2E",
    success: "#32D74B", // Vibrant neon green
    successForeground: "#000000",
    warning: "#FF9F0A", // Vibrant neon orange
    warningForeground: "#000000",
  },
  radius: 24,
  yearGradients: [
    ["#0ea5e9", "#0284c7"],
    ["#10b981", "#059669"],
    ["#f59e0b", "#d97706"],
    ["#8b5cf6", "#7c3aed"],
    ["#ec4899", "#db2777"],
    ["#14b8a6", "#0d9488"],
  ],
};

export default colors;
