import { Feather } from "@expo/vector-icons";
import { useColors } from "@/src/shared/hooks/useColors";

export function getRingColor(
  score: number,
  colors: ReturnType<typeof useColors>,
): string {
  if (score >= 80) return colors.success;
  if (score >= 70) return colors.warning;
  if (score >= 60) return colors.warning;
  return colors.destructive;
}

export function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getTitle(score: number): {
  text: string;
  icon: React.ComponentProps<typeof Feather>["name"];
} {
  if (score >= 90) return { text: "Outstanding", icon: "star" };
  if (score >= 80) return { text: "Well done", icon: "award" };
  if (score >= 70) return { text: "Good effort", icon: "trending-up" };
  if (score >= 60) return { text: "Keep going", icon: "book-open" };
  return { text: "Keep practising", icon: "book-open" };
}

