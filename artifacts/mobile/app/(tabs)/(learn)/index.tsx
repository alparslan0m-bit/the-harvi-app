import { router } from "expo-router";
import React, { useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { 
  YearCard, 
  LearnHeader, 
  LearnLoadingState, 
  LearnErrorState, 
  LearnEmptyState 
} from "@/components";

import { useColors } from "@/hooks/useColors";
import { useHierarchy } from "@/hooks/useHierarchy";
import { useLearnFlow } from "@/hooks/useLearnFlow";

/**
 * LearnScreen - Refactored for modularity.
 * The main dashboard displaying the learning hierarchy (Years -> Modules).
 */
export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: years, isLoading, error, refetch } = useHierarchy();

  const scrollRef = useRef<ScrollView>(null);
  
  // Custom hook for auth guard, transitions, and scroll management
  const { authLoading, fadeAnim, translateY } = useLearnFlow(scrollRef);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ── Rendering ──

  const renderContent = () => {
    if (isLoading || authLoading) {
      return <LearnLoadingState />;
    }

    if (error) {
      return <LearnErrorState error={error} onRetry={refetch} />;
    }

    return (
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {years?.map((year, i) => (
          <YearCard
            key={year.id}
            year={year}
            index={i}
            onPress={() =>
              router.push({
                pathname: "/year/[id]",
                params: { id: year.id, index: String(i) },
              })
            }
          />
        ))}

        {(!years || years.length === 0) && <LearnEmptyState />}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LearnHeader topPad={topPad} />

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
      >
        {renderContent()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 12 },
});
