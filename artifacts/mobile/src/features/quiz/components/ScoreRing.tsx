import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useColors } from "@/src/shared/hooks/useColors";

interface ScoreRingProps {
  displayScore: number;
  ringColor: string;
  grade: string;
  ringAnimStyle: StyleProp<ViewStyle>;
}

export function ScoreRing({
  displayScore,
  ringColor,
  grade,
  ringAnimStyle,
}: ScoreRingProps) {
  const colors = useColors();
  
  return (
    <Animated.View style={[styles.ringWrap, ringAnimStyle]}>
      <View style={[styles.ringOuter, { borderColor: ringColor + "33" }]}>
        <View style={[styles.ringInner, { borderColor: ringColor }]}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: ringColor }]}>
              {displayScore}
            </Text>
            <Text style={[styles.scorePct, { color: ringColor }]}>%</Text>
          </View>
          <Text style={[styles.gradeHint, { color: ringColor, opacity: 0.8 }]}>
            out of 100
          </Text>
        </View>
      </View>
      <View style={[
        styles.gradeBadge, 
        { 
          backgroundColor: ringColor,
          borderColor: colors.background,
          borderWidth: 4
        }
      ]}>
        <Text style={styles.gradeText}>{grade}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ringWrap: { 
    alignItems: "center", 
    marginTop: 0, 
    marginBottom: 28 
  },
  ringOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  scoreRow: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    gap: 2 
  },
  scoreNum: {
    fontSize: 48,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -1,
  },
  scorePct: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  gradeHint: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  gradeBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: { 
    fontSize: 20, 
    fontFamily: "Inter_800ExtraBold", 
    color: "#fff" 
  },
});
