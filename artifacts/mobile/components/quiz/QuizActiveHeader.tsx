import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface QuizActiveHeaderProps {
  lectureName: string;
  currentIndex: number;
  totalQuestions: number;
  topPad: number;
  colors: any;
  onClose: () => void;
}

export function QuizActiveHeader({
  lectureName,
  currentIndex,
  totalQuestions,
  topPad,
  colors,
  onClose,
}: QuizActiveHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: topPad + 10 }]}>
      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={[styles.iconBtn, { backgroundColor: colors.muted }]}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={18} color={colors.foreground} />
      </TouchableOpacity>

      {/* Lecture name */}
      <Text
        style={[styles.lectureName, { color: colors.mutedForeground }]}
        numberOfLines={1}
      >
        {lectureName}
      </Text>

      {/* Question counter chip */}
      <View
        style={[
          styles.counterChip,
          {
            backgroundColor: colors.muted + "80",
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.counterCurrent, { color: colors.foreground }]}>
          {currentIndex + 1}
        </Text>
        <Text style={[styles.counterTotal, { color: colors.mutedForeground }]}>
          /{totalQuestions}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lectureName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  counterChip: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  counterCurrent: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.3,
  },
  counterTotal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
