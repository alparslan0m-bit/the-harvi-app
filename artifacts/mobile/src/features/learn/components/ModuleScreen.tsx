import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SubjectCard } from "@/src/features/learn";
import { useColors } from "@/src/shared/hooks/useColors";
import { useHierarchy } from "@/src/features/learn/hooks/useHierarchy";
import { useProgress } from "@/src/features/learn/hooks/useProgress";
import { useModuleAccess } from "@/src/features/learn/hooks/useModuleAccess";

export function ModuleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: years } = useHierarchy();
  const { data: accessMap } = useModuleAccess();
  const completedIds = useProgress();

  const module = years?.flatMap((y) => y.modules).find((m) => m.id === id);
  const moduleAccess = accessMap?.get(id);
  const hasModuleAccess = moduleAccess?.has_access || moduleAccess?.is_free;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!module) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            backgroundColor: colors.background,
            borderBottomColor: "transparent",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {module.name}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          SUBJECTS
        </Text>

        {module.subjects.map((sub, i) => {
          const completedCount = sub.lectures.filter(
            (lec) =>
              completedIds.has(lec.external_id) || completedIds.has(lec.id),
          ).length;

          // Subject-level access check
          const subAccess = accessMap?.get(sub.id);
          const isLocked = !hasModuleAccess && !subAccess?.has_access && !subAccess?.is_free;
          const isFreePreview = !!(!hasModuleAccess && (subAccess?.is_free || sub.is_free));

          return (
            <SubjectCard
              key={sub.id}
              subject={sub}
              index={i}
              completedCount={completedCount}
              isLocked={isLocked}
              isFreePreview={isFreePreview}
              onPress={() => {
                if (isLocked) {
                  router.push({
                    pathname: "/purchase/[moduleId]",
                    params: {
                      moduleId: module.id,
                      moduleName: module.name,
                      priceDisplay: `$${((moduleAccess?.price_cents ?? 0) / 100).toFixed(2)}`,
                      productId: module.external_price_id || "",
                    }
                  });
                } else {
                  router.push({
                    pathname: "/subject/[id]",
                    params: { id: sub.id },
                  });
                }
              }}
            />
          );
        })}

        {module.subjects.length === 0 && (
          <View style={styles.empty}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No subjects yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 36,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  list: { paddingTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

