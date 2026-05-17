# Subscription Psychology: Paywall Layouts, Conversion & User Retention

This document defines the interface standards, psychological design patterns, and billing layout guidelines for user purchase and checkout systems in the App Factory workspace.

---

## 1. The Psychology of Premium Conversion

Paywall screens must never feel transactional or aggressive. Instead, they should build **trust, clarity, and clear value**. Harvi applies these 4 psychological principles:

1.  **Loss Aversion Visuals**: Instead of generic lists like "Buy Premium," frame options as saving or protecting progress:
    *   *Copy*: "Don't lose your 5-day quiz streak. Unlock full explanations now."
2.  **Explicit Choice Framing (Decoy Effect)**: Offer three logical plans:
    *   *Monthly*: $14.99/mo (Standard tier)
    *   *Yearly*: $7.49/mo ($89.99 billed annually - **Highlight as "Best Value"**)
    *   *Lifetime*: $199.99 (Anchor tier, makes Yearly look highly attractive)
3.  **Social Proof and trust Indicators**: Place direct quotes from successful users (or medical students) directly above the pricing grids to reduce buying anxiety.
4.  **Instant Cancellation Assurances**: Clear, transparent copy placed directly below the checkout button assuring the user they can cancel easily in 1 click.

---

## 2. High-Converting Paywall UI Blueprint

```tsx
// components/paywall/PaywallSheet.tsx
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { triggerHapticSelection } from "@/lib/haptics";

export interface PlanOption {
  id: string;
  name: string;
  priceDisplay: string;
  periodDisplay: string;
  badge?: string;
  isPopular?: boolean;
}

const PLANS: PlanOption[] = [
  { id: "monthly", name: "Monthly", priceDisplay: "$14.99", periodDisplay: "/ month" },
  { id: "yearly", name: "Yearly Access", priceDisplay: "$7.49", periodDisplay: "/ month", badge: "Save 50%", isPopular: true },
  { id: "lifetime", name: "Lifetime", priceDisplay: "$199.99", periodDisplay: " once" },
];

export function PaywallSheet({ onCheckout }: { onCheckout: (planId: string) => void }) {
  const colors = useColors();
  const [selectedPlan, setSelectedPlan] = useState("yearly");

  const handleSelect = (id: string) => {
    triggerHapticSelection();
    setSelectedPlan(id);
  };

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.foreground }]}>Accelerate Your Learning</Text>
      <Text style={[styles.subheader, { color: colors.mutedForeground }]}>
        Join over 10,000+ medical students passing with flying colors.
      </Text>

      {/* Plan Selectors */}
      <View style={styles.planContainer}>
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.85}
              onPress={() => handleSelect(plan.id)}
              style={[
                styles.planCard,
                {
                  backgroundColor: isSelected ? colors.primary + "1A" : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                {plan.badge && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardPricing}>
                <Text style={[styles.price, { color: colors.foreground }]}>{plan.priceDisplay}</Text>
                <Text style={[styles.period, { color: colors.mutedForeground }]}>{plan.periodDisplay}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        onPress={() => onCheckout(selectedPlan)}
        style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.btnText}>Start 7-Day Free Trial</Text>
      </TouchableOpacity>

      <Text style={[styles.terms, { color: colors.mutedForeground }]}>
        Cancel anytime inside Apple Subscriptions. Billed after trial.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 24, borderRadius: 24, gap: 16 },
  header: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", textAlign: "center" },
  subheader: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 16, lineHeight: 20 },
  planContainer: { gap: 12, marginVertical: 12 },
  planCard: { padding: 16, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  cardPricing: { alignItems: "flex-end" },
  price: { fontSize: 18, fontFamily: "Inter_700Bold" },
  period: { fontSize: 12, fontFamily: "Inter_400Regular" },
  checkoutBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  terms: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", opacity: 0.8 },
});
```

---

## 3. Handling Trial Expirations

To prevent users from churning abruptly when a trial expires, Harvi implements gentle, early notifications (Push alerts) 2 days prior to billing, explaining exactly what value was unlocked and directing them to a personalized subscription center.

---

# Anti-Patterns

*   **Hidden Pricing Disclosures**: Hiding terms like "billed annually after 7-day trial" inside small, muted terms blocks, leading to chargeback requests.
    *   *Consequence*: Payment processors (Stripe/Apple) will flag the app for excessive disputes, threatening merchant account suspension.
*   **The Zero-Choice Anchor**: Presenting only a single plan option (e.g. "$19.99/mo") on the paywall screen.
    *   *Consequence*: Users will make a binary choice ("Should I buy or not?") rather than a value choice ("Which plan fits me best?"), reducing conversions by over 40%.
*   **Interrupting User Workflows**: Mounting blocking paywall sheet overlays right in the middle of active user focus periods (e.g. while they are in the middle of answering a quiz question).
    *   *Consequence*: Destroys user trust, spikes session abandonment rates, and drives negative store reviews. Contextually suggest checkout upon completing the quiz.
