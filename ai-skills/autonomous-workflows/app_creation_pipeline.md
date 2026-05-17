# App Creation Pipeline: Cold-Setup Orchestration & Verification

This document defines the automated stages, verification gates, and compilation checks required to initialize, configure, and compile a brand-new React Native mobile application from a cold setup.

---

## 1. Pipeline Execution Workflow

The app creation pipeline must be executed sequentially, verifying each milestone before moving to the next:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Setup & Initialization             │
        │  npx create-vite-app or expo init under pnpm           │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │              Stage 2: Package Injection                │
        │  Install dependencies: Reanimated, NetInfo, Supabase  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Core Scaffolding                  │
        │  Deploy folder maps, app/ layout routers, theme hooks  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Stage 4: Verification & Compile             │
        │  Run compilation checks, trace errors, self-heal      │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Structural Quality Gateways

To pass Stage 4, the created application must satisfy the following checks:

| Milestone Gate | Required Condition | Telemetry Action on Failure |
| :--- | :--- | :--- |
| **Package Alignment**| Version check. Expo SDK matches React Native package dependencies. | Halt pipeline execution. Recalculate package matching dependencies array. |
| **Compile Gate** | TypeScript compiles cleanly without error exits (`tsc --noEmit`). | Intercept compiler trace. Route error lines to the Debugging Engine. |
| **Navigation Map** | Central Router exports file-based layout screens dynamically. | Reset Expo router dependencies. Rebuild app entry routes. |

---

## 3. Autonomous Verification Script Example

AI agents running this pipeline can execute this script inside temporary scratch environments to verify structural health:

```powershell
# Run atomic typescript check
npx tsc --noEmit

# Inspect routing maps setup
if (Test-Path "app/(tabs)/_layout.tsx") {
    Write-Host "Success: Navigation template is present."
} else {
    Write-Error "Failure: Missing TabLayout routing!"
}
```

---

# Anti-Patterns to Avoid

*   **Bypassing Package Sync Verification**: Installing arbitrary dependency versions without checking SDK compatibility.
    *   *Consequence*: Triggers native library conflicts during build steps, rendering iOS/Android bundles unbuildable.
*   **Monolithic Initial Scaffolds**: Generating all pages, settings, and database hooks before verifying that a blank screen compiles cleanly.
    *   *Consequence*: Makes error isolation complex and troubleshooting extremely slow. Verify blank shells first.
