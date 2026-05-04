import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import colors from "@/constants/colors";
import { Year } from "@/types";

interface Props {
  year: Year;
  index: number;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function YearCard({ year, index, onPress }: Props) {
  const scale = useSharedValue(1);
  const gradient = colors.yearGradients[index % colors.yearGradients.length] as [string, string];

  const totalSubjects = year.modules.reduce((sum, m) => sum + m.subjects.length, 0);
  const totalLectures = year.modules.reduce(
    (sum, m) => sum + m.subjects.reduce((s2, sub) => s2 + sub.lectures.length, 0),
    0
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
      activeOpacity={1}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{year.name}</Text>
        </View>
        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  gradient: {
    padding: 20,
    minHeight: 90,
    overflow: "hidden",
    position: "relative",
  },
  content: { zIndex: 2 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  metaDot: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  decorCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    right: -30,
    top: -30,
  },
  decorCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    right: 50,
    bottom: -20,
  },
});
