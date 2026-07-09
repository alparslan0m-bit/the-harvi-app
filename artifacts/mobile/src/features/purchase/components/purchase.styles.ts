// Shared styles for purchase components — extracted from PurchaseScreen.tsx
import { StyleSheet } from "react-native";

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
});
