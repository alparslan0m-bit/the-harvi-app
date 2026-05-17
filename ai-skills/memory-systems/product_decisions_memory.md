# Product Decisions Memory: Conversion Registries & UX Conversion Logs

This document defines the metrics schemas, monetization rules, and conversion tracking protocols required to capture and utilize user psychology outcomes inside the App Factory workspace.

---

## 1. Product Decision Log Schema

To log a newly deployed subscription screen, loss-aversion banner, or paywall layout, the agent must append a record conforming to this schema:

```json
{
  "decisionId": "string (unique key, e.g. monthlyYearlyDecoyPricing)",
  "monetizationStructure": "string (subscription | flat-purchase | ad-based)",
  "appliedConversionPsychology": "string (decoy plan pricing configuration)",
  "pricingParameters": {
    "monthlyPriceInUSD": 9.99,
    "yearlyPriceInUSD": 59.99,
    "lifetimePriceInUSD": 149.99
  },
  "userConversionRateIncreasePercentage": 14.5
}
```

---

## 2. Dynamic Conversion Injection Workflow

When designing paywalls or checkout interfaces, the generating agent must use the **Psychology Rules** recorded in memory to maximize conversions:

```
                  ┌──────────────────────────────┐
                  │    Design Paywall/Checkout   │
                  └──────────────┬───────────────┘
                                 │
                  Is decoy pricing registered in product memory?
                  ├── Yes ──► Apply monthly/yearly/lifetime option layout
                  └── No  ──► Render basic flat pricing card
```

---

## 3. High-Converting Paywall Guidelines

*   **Decoy Plan Selection**: Render a monthly option, a yearly option (highlighted as the best value), and a lifetime option to drive premium tier upgrades.
*   **Active Loss-Aversion**: Display high-converting copy highlighting the price savings and immediate benefits of upgrading to secure purchase decisions.

---

# Anti-Patterns to Avoid

*   **Static Hardcoded Pricing**: Locking pricing strings directly inside component code layouts instead of pulling them from database RPCs or remote config maps.
    *   *Consequence*: Prevents remote marketing adjustments and forces app store updates for price changes.
*   **Concealing Subscription Terms**: Hiding legal renewal terms and cancel procedures from subscription interfaces.
    *   *Consequence*: Violates App Store guidelines, leading to store review rejections and user chargeback spikes.
