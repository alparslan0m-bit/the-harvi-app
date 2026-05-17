# Autonomous Debugging Engine: Diagnostics Trees, Isolations & Self-Healing

This document outlines the systematic diagnostics trees, memory leaks troubleshooting workflows, and error isolation heuristics of the Harvi AI App Factory OS.

---

## 1. Diagnostics & Error Categorization Tree

When encountering a crash, compiler error, or layout shift, the AI agent must utilize the **Dynamic Diagnostics Tree** to classify and isolate the issue:

```
                              [ Crash Alert / Failure ]
                                          │
                        Is it a Native Build compilation error?
                        ├── Yes ──► Run EAS Clean Cache ──► Rebuild native platforms
                        │
                        └── No  ──► Is the crash happening on screen load?
                                    ├── Yes ──► Check optional typings (?.), null props, and SecureStore limits
                                    └── No  ──► Check rendering loop (state modifications in scroll events)
```

---

## 2. Dynamic Issue Isolation Playbook

To trace a bug efficiently without modifying stable code blocks, follow the **Issue Isolation Workflow**:

```
        ┌────────────────────────────────────────────────────────┐
        │            Step 1: Check Telemetry Trace               │
        │  Read the full error call stack and pinpoint origin   │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Step 2: Isolate State Triggers             │
        │  Replicate the crash with a unit mock payload script  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Step 3: Check Environment Logs             │
        │  Verify client dev vs prod environmental parameters    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Step 4: Hot-Fix & Self-Heal                │
        │  Deploy targeted logic patch, check compiler, verify   │
        └────────────────────────────────────────────────────────┘
```

---

## 3. High-Frequency Native Performance Troubleshooting

Use the following diagnostics matrices to isolate performance problems:

### A. Rendering Stutter (Frame Rates < 60 FPS)
*   **The Cause**: Heavy layouts, unmemoized list cards, or layout changes (`width`/`height` animations) inside loops.
*   **The Diagnostic**: Inspect component file lengths. Use Reanimated shared values (`useSharedValue`) to shift transitions to native threads. Memoize cards via `React.memo`.

### B. High Memory Heap Growth (App Termination)
*   **The Cause**: Giant raw images loading directly from storage rolls into small visual blocks.
*   **The Diagnostic**: Locate `Image` component declarations. Force dynamic CDN scaling transformations (AVIF/WebP, quality 85, absolute bounds) in image source URI tags.

---

# Anti-Patterns to Avoid

*   **Shotgun Debugging**: Modifying multiple unrelated sections of the codebase simultaneously in hopes of fixing a single error.
    *   *Consequence*: Creates messy Git diffs, introduces new hidden regression bugs, and breaks compiling paths.
*   **Blind Try-Catch Wrapping**: Silently catching all errors (`try {} catch {}`) to suppress logs and bypass warnings.
    *   *Consequence*: Suppresses telemetry signals, hides critical database constraints failures, and makes app behavior unpredictable.
*   **Hardcoded Environment Settings**: Hardcoding production server endpoints inside debugging mock files.
    *   *Consequence*: Exposes secure testing sandboxes, triggers API payload conflicts, and leads to accidental data leakage.
