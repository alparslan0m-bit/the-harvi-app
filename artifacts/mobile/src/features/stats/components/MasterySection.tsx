import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MasteryBar } from "./MasteryBar";
import { useColors } from "@/src/shared/hooks/useColors";
import { UserStats } from "@/src/shared/types";

export function MasterySection({ masteryData }: { masteryData: UserStats["subject_mastery"] }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Pressable
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
      </Pressable>
      <View style={{ marginTop: 20 }}>
        {masteryData.slice(0, 3).map((item, i) => (
          <MasteryBar key={i} subject={item.subject} mastery={item.mastery} />
        ))}
      </View>
      {masteryData.length > 3 && (
        <Pressable
          style={[
            styles.moreBtn,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
          onPress={() => router.push("/stats/mastery")}
        >
          <Text style={[styles.moreBtnText, { color: colors.foreground }]}>
            +{masteryData.length - 3} more subjects
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
    borderRadius: 14,
    borderWidth: 1,
  },
  moreBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
