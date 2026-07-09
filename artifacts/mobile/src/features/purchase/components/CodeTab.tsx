// Extracted from PurchaseScreen.tsx — Access code input + redeem flow tab
import React, { useState } from "react";
import { Text, TextInput, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

import type { ThemeColors } from "@/src/shared/hooks/useColors";
import type { PurchaseStatus } from "@/src/features/purchase/hooks/usePurchase";
import { SPRING_CONFIG } from "./purchase.constants";
import { PremiumButton } from "./PremiumButton";
import { sharedStyles } from "./purchase.styles";

export const CodeTab = React.memo(function CodeTab({
  submitCode,
  status,
  error,
  onSuccess,
  colors,
}: {
  submitCode: (code: string) => Promise<{ success: boolean; itemName?: string | undefined; error?: string | undefined }>;
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
      style={sharedStyles.tabContent}
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
        style={[sharedStyles.footer, { color: colors.mutedForeground }]}
      >
        Codes can be purchased from authorized bookshops.
      </Animated.Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
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
});
