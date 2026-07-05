// artifacts/mobile/app/purchase/[moduleId].tsx
// Purchase screen with two tabs: native IAP and access code redemption.
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

import { usePurchase } from "@/src/features/purchase/hooks/usePurchase";
import { useColors } from "@/src/shared/hooks/useColors";

type Tab = "buy" | "code";

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
  const [codeInput, setCodeInput] = useState("");
  const [rcPackage, setRcPackage] = useState<PurchasesPackage | null>(null);
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  // ── Load RevenueCat product ───────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web" || !productId) {
      setLoadingProduct(false);
      return;
    }

    const load = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        // Search all offerings for a package matching the product
        const allOfferings = offerings.all;
        for (const key of Object.keys(allOfferings)) {
          const offering = allOfferings[key];
          if (!offering) continue;
          for (const pkg of offering.availablePackages) {
            if (pkg.product.identifier === productId) {
              setRcPackage(pkg);
              setStorePrice(pkg.product.priceString);
              break;
            }
          }
        }
      } catch (e) {
        console.error("[PurchaseScreen] Failed to load product:", e);
      } finally {
        setLoadingProduct(false);
      }
    };

    load();
  }, [productId]);

  // ── Handlers ──────────────────────────────────────────────
  const handleBuy = async () => {
    if (!rcPackage) return;
    const result = await buyModule(moduleId, rcPackage);
    if (result.success) {
      setSuccessMessage("Purchase complete! You now have full access.");
    }
  };

  const handleRedeem = async () => {
    if (!codeInput.trim()) return;
    const result = await submitCode(codeInput.trim());
    if (result.success) {
      setSuccessMessage(
        `Code redeemed! You now have access to ${result.itemName ?? "this content"}.`,
      );
    }
  };

  const handleRestore = async () => {
    if (!productId) return;
    const result = await restorePurchase(moduleId, productId);
    if (result.success) {
      setSuccessMessage("Purchase restored successfully! You now have full access.");
    }
  };

  const handleDone = () => {
    reset();
    router.back();
  };

  const isLoading = status === "loading";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const displayPrice = storePrice ?? priceDisplay ?? "—";
  const isBuyDisabled = Platform.OS === "web" || !rcPackage || loadingProduct;

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
        <View style={[styles.header, { paddingTop: topPad + 14 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Icon & Title */}
          <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
            <Feather name="package" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{moduleName}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Unlock all lectures and questions for this module forever.
          </Text>

          {/* ── Success State ─────────────────────────────────── */}
          {status === "success" ? (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={40} color={colors.success} />
              <Text style={[styles.successText, { color: colors.foreground }]}>
                {successMessage}
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleDone}
              >
                <Text style={styles.btnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Tab Switcher ──────────────────────────────── */}
              <View style={[styles.tabRow, { backgroundColor: colors.muted }]}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    tab === "buy" && { backgroundColor: colors.background },
                  ]}
                  onPress={() => { setTab("buy"); reset(); }}
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
                  style={[
                    styles.tab,
                    tab === "code" && { backgroundColor: colors.background },
                  ]}
                  onPress={() => { setTab("code"); reset(); }}
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

              {/* ── Error Display ─────────────────────────────── */}
              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                  <Feather name="alert-circle" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              )}

              {/* ── Buy Tab ──────────────────────────────────── */}
              {tab === "buy" && (
                <View style={styles.tabContent}>
                  <Text style={[styles.price, { color: colors.primary }]}>{displayPrice}</Text>

                  {loadingProduct ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        {
                          backgroundColor: isBuyDisabled
                            ? colors.mutedForeground
                            : colors.primary,
                        },
                      ]}
                      onPress={handleBuy}
                      disabled={isLoading || isBuyDisabled}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Feather name="shopping-bag" size={18} color="#fff" />
                          <Text style={styles.btnText}>
                            {Platform.OS === "web" ? "Not available on web" : "Purchase Now"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <Text style={[styles.footer, { color: colors.mutedForeground }]}>
                    {Platform.OS === "ios"
                      ? "Payment processed by Apple App Store."
                      : Platform.OS === "android"
                        ? "Payment processed by Google Play."
                        : "In-app purchase available on mobile only."}
                  </Text>

                  {Platform.OS !== "web" && productId && (
                    <TouchableOpacity
                      style={styles.restoreBtn}
                      onPress={handleRestore}
                      disabled={isLoading}
                    >
                      <Text style={[styles.restoreBtnText, { color: colors.primary }]}>
                        Restore Purchases
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ── Code Tab ─────────────────────────────────── */}
              {tab === "code" && (
                <View style={styles.tabContent}>
                  <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
                    Enter the access code from your bookshop receipt
                  </Text>

                  <TextInput
                    style={[
                      styles.codeInput,
                      {
                        backgroundColor: colors.muted,
                        color: colors.foreground,
                        borderColor: error ? colors.destructive : colors.border,
                      },
                    ]}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    placeholderTextColor={colors.mutedForeground}
                    value={codeInput}
                    onChangeText={setCodeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={19}
                    editable={!isLoading}
                  />

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      {
                        backgroundColor: !codeInput.trim()
                          ? colors.mutedForeground
                          : colors.primary,
                      },
                    ]}
                    onPress={handleRedeem}
                    disabled={isLoading || !codeInput.trim()}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Feather name="unlock" size={18} color="#fff" />
                        <Text style={styles.btnText}>Redeem Code</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text style={[styles.footer, { color: colors.mutedForeground }]}>
                    Codes can be purchased from authorized bookshops.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingHorizontal: 20,
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
    padding: 24,
    gap: 20,
    marginTop: -40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
    paddingHorizontal: 20,
  },
  // Tab bar
  tabRow: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    width: "100%",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  // Tab content
  tabContent: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  price: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    width: "100%",
  },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  // Success
  successBox: { alignItems: "center", gap: 16, width: "100%" },
  successText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 24,
  },
  // Code input
  codeLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  codeInput: {
    width: "100%",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    textAlign: "center",
  },
  restoreBtn: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  restoreBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
