import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

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
  return (
    <Animated.View style={[styles.ringWrap, ringAnimStyle]}>
      <View style={[styles.ringOuter, { borderColor: ringColor + "20" }]}>
        <View style={[styles.ringInner, { borderColor: ringColor }]}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: ringColor }]}>
              {displayScore}
            </Text>
            <Text style={[styles.scorePct, { color: ringColor }]}>%</Text>
          </View>
          <Text style={[styles.gradeHint, { color: ringColor + "99" }]}>
            out of 100
          </Text>
        </View>
      </View>
      <View style={[styles.gradeBadge, { backgroundColor: ringColor }]}>
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
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },
  gradeBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradeText: { 
    fontSize: 19, 
    fontFamily: "Inter_800ExtraBold", 
    color: "#fff" 
  },
});
