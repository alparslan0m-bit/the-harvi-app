import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { MasteryBar } from "./MasteryBar";
import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { UserStats } from "@/src/shared/types";
import { AnimatedPressable } from "@/src/shared/components";

export function MasterySection({
  masteryData,
}: {
  masteryData: UserStats["subject_mastery"];
}) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <AnimatedPressable
        feedback="opacity"
        style={styles.sectionHeader}
        onPress={() => router.push("/stats/mastery")}
      >
        <View style={styles.sectionTitleRow}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.success + "1A" },
            ]}
          >
            <Feather name="award" size={14} color={colors.success} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Subject Mastery
          </Text>
        </View>
        <View style={styles.seeAll}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>
            View All
          </Text>
          <Feather name="chevron-right" size={15} color={colors.primary} />
        </View>
      </AnimatedPressable>
      <View style={{ marginTop: 20 }}>
        {masteryData.slice(0, 3).map((item, i) => (
          <MasteryBar key={i} subject={item.subject} mastery={item.mastery} />
        ))}
      </View>
      {masteryData.length > 3 && (
        <AnimatedPressable
          feedback="opacity"
          style={[styles.moreBtn, { backgroundColor: colors.muted }]}
          onPress={() => router.push("/stats/mastery")}
        >
          <Text style={[styles.moreBtnText, { color: colors.foreground }]}>
            +{masteryData.length - 3} more subjects
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: THEME.radius,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 12, // §4 radius.sm
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: THEME.radius,
  },
  moreBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
