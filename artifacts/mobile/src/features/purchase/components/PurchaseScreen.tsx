// artifacts/mobile/app/purchase/[moduleId].tsx
// Purchase screen with two tabs: native IAP and access code redemption.
// Premium UI: gradient hero, animated tabs, spring buttons, entry animations.
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  LayoutChangeEvent,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

import { usePurchase, type PurchaseStatus } from "@/src/features/purchase/hooks/usePurchase";
import { useColors, type ThemeColors } from "@/src/shared/hooks/useColors";

type Tab = "buy" | "code";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

// ── Hero Icon with Gradient Orb ──────────────────────────────

const HeroIcon = React.memo(function HeroIcon({
  colors,
}: {
  colors: ThemeColors;
}) {
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true,
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.heroWrapper}>
      {/* Pulsing glow ring */}
      <Animated.View
        style={[
          styles.heroGlow,
          { backgroundColor: colors.primary + "20" },
          glowStyle,
        ]}
      />

      {/* Gradient orb */}
      <LinearGradient
        colors={[colors.primary, colors.accent + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroOrb}
      >
        <View style={styles.heroInnerBorder} />
        <Feather name="package" size={36} color="#fff" />

        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </Animated.View>
  );
});

// ── Animated Tab Switcher ────────────────────────────────────

const TabSwitcher = React.memo(function TabSwitcher({
  tab,
  onTabChange,
  colors,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  colors: ThemeColors;
}) {
  const [tabWidth, setTabWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = (e.nativeEvent.layout.width - 8) / 2; // minus padding
      setTabWidth(w);
      indicatorX.value = tab === "buy" ? 0 : w;
    },
    [tab, indicatorX],
  );

  useEffect(() => {
    indicatorX.value = withSpring(tab === "buy" ? 0 : tabWidth, SPRING_CONFIG);
  }, [tab, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View
        style={[styles.tabRow, { backgroundColor: colors.muted }]}
        onLayout={handleLayout}
      >
        {/* Sliding indicator */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.tabIndicator,
              { backgroundColor: colors.background },
              indicatorStyle,
            ]}
          />
        )}

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange("buy")}
          activeOpacity={0.7}
        >
          <Feather
            name="shopping-bag"
            size={16}
            color={tab === "buy" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "buy" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Buy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange("code")}
          activeOpacity={0.7}
        >
          <Feather
            name="key"
            size={16}
            color={tab === "code" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: tab === "code" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Access Code
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

// ── Premium CTA Button ───────────────────────────────────────

const PremiumButton = React.memo(function PremiumButton({
  onPress,
  disabled,
  loading,
  icon,
  label,
  colors,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  icon: string;
  label: string;
  colors: ThemeColors;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.ctaOuter, animStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {disabled ? (
        <View
          style={[
            styles.ctaInner,
            { backgroundColor: colors.mutedForeground },
          ]}
        >
          <Feather name={icon as any} size={18} color="#fff" />
          <Text style={styles.ctaText}>{label}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaInner}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name={icon as any} size={18} color="#fff" />
              <Text style={styles.ctaText}>{label}</Text>
            </>
          )}
        </LinearGradient>
      )}
    </AnimatedTouchable>
  );
});

// ── Buy Tab ──────────────────────────────────────────────────

const BuyTab = React.memo(function BuyTab({
  productId,
  moduleId,
  priceDisplay,
  buyModule,
  restorePurchase,
  status,
  onSuccess,
  colors,
}: {
  productId?: string;
  moduleId: string;
  priceDisplay: string;
  buyModule: (moduleId: string, rcPackage: PurchasesPackage) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  restorePurchase: (moduleId: string, productId: string) => Promise<{ success: boolean; error?: string }>;
  status: PurchaseStatus;
  onSuccess: (msg: string) => void;
  colors: ThemeColors;
}) {
  const [rcPackage, setRcPackage] = useState<PurchasesPackage | null>(null);
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web" || !productId) {
      setLoadingProduct(false);
      return;
    }

    let isMounted = true;
    const load = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const allOfferings = offerings.all;
        for (const key of Object.keys(allOfferings)) {
          const offering = allOfferings[key];
          if (!offering) continue;
          for (const pkg of offering.availablePackages) {
            if (pkg.product.identifier === productId) {
              if (isMounted) {
                setRcPackage(pkg);
                setStorePrice(pkg.product.priceString);
              }
              break;
            }
          }
        }
      } catch (e) {
        console.error("[BuyTab] Failed to load product:", e);
      } finally {
        if (isMounted) setLoadingProduct(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleBuy = async () => {
    if (!rcPackage) return;
    const result = await buyModule(moduleId, rcPackage);
    if (result.success) {
      onSuccess("Purchase complete! You now have full access.");
    }
  };

  const handleRestore = async () => {
    if (!productId) return;
    const result = await restorePurchase(moduleId, productId);
    if (result.success) {
      onSuccess("Purchase restored successfully! You now have full access.");
    }
  };

  const isLoading = status === "loading";
  const displayPrice = storePrice ?? priceDisplay ?? "—";
  const isBuyDisabled = Platform.OS === "web" || !rcPackage || loadingProduct;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100)}
      style={styles.tabContent}
    >
      {/* Price Display */}
      <Animated.Text
        entering={FadeInDown.duration(500).delay(150)}
        style={[styles.price, { color: colors.primary }]}
      >
        {displayPrice}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.duration(400).delay(200)}
        style={[styles.priceCaption, { color: colors.mutedForeground }]}
      >
        One-time purchase · Lifetime access
      </Animated.Text>

      {loadingProduct ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <Animated.View
          entering={FadeInDown.duration(400).delay(250)}
          style={{ width: "100%" }}
        >
          <PremiumButton
            onPress={handleBuy}
            disabled={isBuyDisabled}
            loading={isLoading}
            icon="shopping-bag"
            label={Platform.OS === "web" ? "Not available on web" : "Purchase Now"}
            colors={colors}
          />
        </Animated.View>
      )}

      <Animated.Text
        entering={FadeInDown.duration(300).delay(300)}
        style={[styles.footer, { color: colors.mutedForeground }]}
      >
        {Platform.OS === "ios"
          ? "Payment processed by Apple App Store."
          : Platform.OS === "android"
            ? "Payment processed by Google Play."
            : "In-app purchase available on mobile only."}
      </Animated.Text>

      {Platform.OS !== "web" && productId && (
        <Animated.View entering={FadeInDown.duration(300).delay(350)}>
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={[styles.restoreBtnText, { color: colors.primary }]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
});

// ── Code Tab ─────────────────────────────────────────────────

const CodeTab = React.memo(function CodeTab({
  submitCode,
  status,
  error,
  onSuccess,
  colors,
}: {
  submitCode: (code: string) => Promise<{ success: boolean; itemName?: string; error?: string }>;
  status: PurchaseStatus;
  error: string | null;
  onSuccess: (msg: string) => void;
  colors: ThemeColors;
}) {
  const [codeInput, setCodeInput] = useState("");
  const isLoading = status === "loading";

  // Animated border for focus state
  const focusProgress = useSharedValue(0);

  const inputBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [error ? colors.destructive : colors.border, colors.primary],
    ),
    transform: [{ scale: 1 + focusProgress.value * 0.01 }],
  }));

  const handleFocus = () => {
    focusProgress.value = withSpring(1, SPRING_CONFIG);
  };

  const handleBlur = () => {
    focusProgress.value = withSpring(0, SPRING_CONFIG);
  };

  const handleRedeem = async () => {
    if (!codeInput.trim()) return;
    const result = await submitCode(codeInput.trim());
    if (result.success) {
      onSuccess(
        `Code redeemed! You now have access to ${result.itemName ?? "this content"}.`,
      );
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100)}
      style={styles.tabContent}
    >
      <Animated.Text
        entering={FadeInDown.duration(400).delay(150)}
        style={[styles.codeLabel, { color: colors.mutedForeground }]}
      >
        Enter the access code from your bookshop receipt
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={[
          styles.codeInputWrapper,
          { backgroundColor: colors.muted, borderWidth: 1.5, borderRadius: 16 },
          inputBorderStyle,
        ]}
      >
        <TextInput
          style={[
            styles.codeInput,
            { color: colors.foreground },
          ]}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          placeholderTextColor={colors.mutedForeground}
          value={codeInput}
          onChangeText={setCodeInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={19}
          editable={!isLoading}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(250)}
        style={{ width: "100%" }}
      >
        <PremiumButton
          onPress={handleRedeem}
          disabled={!codeInput.trim()}
          loading={isLoading}
          icon="unlock"
          label="Redeem Code"
          colors={colors}
        />
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.duration(300).delay(300)}
        style={[styles.footer, { color: colors.mutedForeground }]}
      >
        Codes can be purchased from authorized bookshops.
      </Animated.Text>
    </Animated.View>
  );
});

// ── Success State ────────────────────────────────────────────

const SuccessState = React.memo(function SuccessState({
  message,
  onDone,
  colors,
}: {
  message: string;
  onDone: () => void;
  colors: ThemeColors;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(14)}
      style={styles.successBox}
    >
      {/* Success gradient orb */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient
          colors={[colors.success, colors.success + "AA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successOrb}
        >
          <Feather name="check" size={32} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.duration(400).delay(100)}
        style={[styles.successText, { color: colors.foreground }]}
      >
        {message}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={{ width: "100%" }}
      >
        <AnimatedTouchable
          style={[styles.ctaOuter, animStyle]}
          onPress={onDone}
          onPressIn={() => {
            scale.value = withSpring(0.96, SPRING_CONFIG);
          }}
          onPressOut={() => {
            scale.value = withSpring(1, SPRING_CONFIG);
          }}
          activeOpacity={1}
        >
          <LinearGradient
            colors={[colors.success, colors.success + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.ctaInner}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.ctaText}>Done</Text>
          </LinearGradient>
        </AnimatedTouchable>
      </Animated.View>
    </Animated.View>
  );
});

// ── Main Screen ──────────────────────────────────────────────

export function PurchaseScreen() {
  const { moduleId, moduleName, priceDisplay, productId } = useLocalSearchParams<{
    moduleId: string;
    moduleName: string;
    priceDisplay: string;
    productId?: string;
  }>();
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

  // ── Hero ──
  heroWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroOrb: {
    width: 88,
    height: 88,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    zIndex: 1,
  },
  decorCircle1: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -16,
    top: -16,
  },
  decorCircle2: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    left: -8,
    bottom: -8,
  },

  // ── Title / Subtitle ──
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

  // ── Tab Bar ──
  tabRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    width: "100%",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    height: "100%",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // ── Tab Content ──
  tabContent: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },

  // ── Price ──
  price: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.5,
  },
  priceCaption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
    letterSpacing: 0.3,
  },

  // ── CTA Button ──
  ctaOuter: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  // ── Error ──
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    width: "100%",
  },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },

  // ── Success ──
  successBox: {
    alignItems: "center",
    gap: 24,
    width: "100%",
  },
  successOrb: {
    width: 72,
    height: 72,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  successText: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 26,
  },

  // ── Code Input ──
  codeLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  codeInputWrapper: {
    width: "100%",
    overflow: "hidden",
  },
  codeInput: {
    width: "100%",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
  },

  // ── Footer ──
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // ── Restore ──
  restoreBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  restoreBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
