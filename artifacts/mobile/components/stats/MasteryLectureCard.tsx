import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

function masteryColor(m: number, colors: any) {
  if (m >= 80) return colors.success;
  if (m >= 50) return colors.warning;
  return colors.destructive;
}

function masteryBg(m: number, colors: any) {
  if (m >= 80) return colors.success + "1A";
  if (m >= 50) return colors.warning + "1A";
  return colors.destructive + "1A";
}

function ProgressBar({ mastery, color, delay = 0 }: { mastery: number; color: string; delay?: number }) {
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withDelay(delay, withTiming(mastery, { duration: 700 }));
  }, [mastery, delay]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as `${number}%` }));
  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, { backgroundColor: color }, animStyle]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
});

export function MasteryLectureCard({
  subject, mastery, rank,
}: { subject: string; mastery: number; rank: number }) {
  const colors = useColors();
  const color = masteryColor(mastery, colors);
  const bg    = masteryBg(mastery, colors);

  return (
    <View style={[
      cardStyles.card, 
      { 
        backgroundColor: colors.card, 
        borderColor: color + "33"
      }
    ]}>
      <View style={[cardStyles.accent, { backgroundColor: color }]} />
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <View style={[cardStyles.rankBadge, { backgroundColor: colors.muted }]}>
            <Text style={[cardStyles.rankText, { color: colors.mutedForeground }]}>{rank}</Text>
          </View>
          <Text style={[cardStyles.name, { color: colors.foreground }]} numberOfLines={2}>
            {subject}
          </Text>
          <View style={[cardStyles.badge, { backgroundColor: bg }]}>
            <Text style={[cardStyles.badgeText, { color }]}>{mastery}%</Text>
          </View>
        </View>
        <View style={cardStyles.barRow}>
          <ProgressBar mastery={mastery} color={color} delay={rank * 40} />
          <Text style={[cardStyles.tierLabel, { color }]}>
            {mastery >= 80 ? "Strong" : mastery >= 50 ? "Improving" : "Needs Work"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: "hidden",
  },
  accent: { width: 4 },
  body: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  name: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tierLabel: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 70, textAlign: "right" },
});
