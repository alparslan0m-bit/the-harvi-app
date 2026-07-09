// artifacts/mobile/app/purchase/[moduleId].tsx
// Purchase screen with two tabs: native IAP and access code redemption.
// Premium UI: gradient hero, animated tabs, spring buttons, entry animations.
import { router, useLocalSearchParams, Redirect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { usePurchase } from "@/src/features/purchase/hooks/usePurchase";
import { useColors } from "@/src/shared/hooks/useColors";

import { AnimatedTouchable } from "./purchase.constants";
import { HeroIcon } from "./HeroIcon";
import { TabSwitcher, type Tab } from "./TabSwitcher";
import { BuyTab } from "./BuyTab";
import { CodeTab } from "./CodeTab";
import { SuccessState } from "./SuccessState";
import { ValueProposition } from "./ValueProposition";

// ── Main Screen ──────────────────────────────────────────────

export function PurchaseScreen() {
  const { moduleId, moduleName, priceDisplay, productId, totalQuestions, totalLectures, totalSubjects } = useLocalSearchParams<{
    moduleId: string;
    moduleName: string;
    priceDisplay: string;
    productId?: string;
    totalQuestions?: string;
    totalLectures?: string;
    totalSubjects?: string;
  }>();
  if (!moduleId || typeof moduleId !== "string") return <Redirect href="/+not-found" />;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buyModule, submitCode, restorePurchase, status, error, reset } = usePurchase();

  const [tab, setTab] = useState<Tab>("buy");
  const [successMessage, setSuccessMessage] = useState("");

  const handleTabChange = useCallback(
    (t: Tab) => {
      setTab(t);
      reset();
    },
    [reset],
  );

  const handleDone = useCallback(() => {
    reset();
    router.back();
  }, [reset]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <AnimatedTouchable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </AnimatedTouchable>
        </View>

        <View style={styles.content}>
          {/* Hero Icon */}
          <HeroIcon colors={colors} />

          {/* Title */}
          <Animated.Text
            entering={FadeInDown.duration(500).delay(100)}
            style={[styles.title, { color: colors.foreground }]}
          >
            {moduleName}
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.duration(400).delay(150)}
            style={[styles.subtitle, { color: colors.mutedForeground }]}
          >
            Unlock all lectures and questions for this module forever.
          </Animated.Text>

          {/* ── Value Proposition Stats ───────────────────────── */}
          <ValueProposition
            totalSubjects={parseInt(totalSubjects ?? "0", 10)}
            totalLectures={parseInt(totalLectures ?? "0", 10)}
            totalQuestions={parseInt(totalQuestions ?? "0", 10)}
            colors={colors}
          />

          {/* ── Success State ─────────────────────────────────── */}
          {status === "success" ? (
            <SuccessState
              message={successMessage}
              onDone={handleDone}
              colors={colors}
            />
          ) : (
            <>
              {/* ── Tab Switcher ──────────────────────────────── */}
              <TabSwitcher
                tab={tab}
                onTabChange={handleTabChange}
                colors={colors}
              />

              {/* ── Error Display ─────────────────────────────── */}
              {error && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={[
                    styles.errorBox,
                    { backgroundColor: colors.destructive + "15" },
                  ]}
                >
                  <Feather name="alert-circle" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>
                    {error}
                  </Text>
                </Animated.View>
              )}

              {/* ── Buy Tab ──────────────────────────────────── */}
              {tab === "buy" && (
                <BuyTab
                  productId={productId}
                  moduleId={moduleId}
                  priceDisplay={priceDisplay}
                  buyModule={buyModule}
                  restorePurchase={restorePurchase}
                  status={status}
                  onSuccess={setSuccessMessage}
                  colors={colors}
                />
              )}

              {/* ── Code Tab ─────────────────────────────────── */}
              {tab === "code" && (
                <CodeTab
                  submitCode={submitCode}
                  status={status}
                  error={error}
                  onSuccess={setSuccessMessage}
                  colors={colors}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
    marginTop: -32,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    width: "100%",
  },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
});
