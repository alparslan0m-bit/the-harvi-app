# Release Engineering Pipeline: EAS Packaging, Metadata Checks & Store Deployment

This document defines the release workflows, native packaging configurations, and deployment pipelines required to ship mobile bundles to the Apple App Store and Google Play Store using EAS (Expo Application Services).

---

## 1. Release Engineering Workflow

Before shipping production updates, the release workflow must execute the following sequential stages:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Versioning & Metadata              │
        │  Increment build numbers in app.json, check hooks     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Pre-flight Audit                  │
        │  Verify clean compile and zero console logs in bundle  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: EAS Build Packaging               │
        │  Execute remote cloud compilation for iOS/Android     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │              Stage 4: Store Submission                 │
        │  Route completed build artifacts to app store tracks   │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Release Quality Gateways

To pass Stage 2, the release build must meet the following criteria:

| Gate | Required Condition | Telemetry Action on Failure |
| :--- | :--- | :--- |
| **`app.json` Sync** | `version` and `ios.buildNumber` / `android.versionCode` incremented. | Halt release. Auto-increment build numbers. |
| **Console Prune** | All `console.log` statements are stripped from production JS bundles. | Run AST pruner to strip debug logs. |
| **Asset Check** | All required icons and splash assets compile to correct sizes. | Validate path assets under `/assets`. |

---

## 3. Automation Commands

AI agents can trigger cloud compilation using these standard CLI patterns:

```powershell
# Run local preflight compilation
npx tsc --noEmit

# Trigger remote cloud build for production profiles
eas build --platform all --profile production --non-interactive

# Submit completed build artifacts to app stores
eas submit --platform all --non-interactive
```

---

# Anti-Patterns to Avoid

*   **Shipping with Active Console Logs**: Leaving verbose debug `console.log` statements in production JS bundles.
    *   *Consequence*: Degrades runtime performance, balloons system logs, and potentially leaks user credentials.
*   **Bypassing Local Preflights**: Running cloud builds (`eas build`) without executing local compilation checks (`tsc`) first.
    *   *Consequence*: Wastes expensive cloud compilation credits and builder time on syntax errors that could have been caught locally.
