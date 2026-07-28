// Shared styles for purchase components — extracted from PurchaseScreen.tsx
import { StyleSheet } from "react-native";
import { THEME } from "@/src/shared/constants/theme";

export const sharedStyles = StyleSheet.create({
  // Used by BuyTab + CodeTab
  tabContent: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },

  // Used by BuyTab + CodeTab
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // Used by PremiumButton + SuccessState
  ctaOuter: {
    width: "100%",
    borderRadius: THEME.radius,
    overflow: "hidden",
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: THEME.radius,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
