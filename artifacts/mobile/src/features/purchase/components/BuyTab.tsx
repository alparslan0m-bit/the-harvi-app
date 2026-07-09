// Extracted from PurchaseScreen.tsx — IAP product loading + purchase flow tab
import React, { useState, useEffect } from "react";
import { Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

import type { ThemeColors } from "@/src/shared/hooks/useColors";
import type { PurchaseStatus } from "@/src/features/purchase/hooks/usePurchase";
import { PremiumButton } from "./PremiumButton";
import { sharedStyles } from "./purchase.styles";

export const BuyTab = React.memo(function BuyTab({
  productId,
  moduleId,
  priceDisplay,
  buyModule,
  restorePurchase,
  status,
  onSuccess,
  colors,
}: {
  productId?: string | undefined;
  moduleId: string;
  priceDisplay: string;
  buyModule: (moduleId: string, rcPackage: PurchasesPackage) => Promise<{ success: boolean; cancelled?: boolean; error?: string | undefined }>;
  restorePurchase: (moduleId: string, productId: string) => Promise<{ success: boolean; error?: string | undefined }>;
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
      style={sharedStyles.tabContent}
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
        style={[sharedStyles.footer, { color: colors.mutedForeground }]}
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

const styles = StyleSheet.create({
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
