# Error Handling & Crash Protection: Recoveries, Telemetry & Fallbacks

This document outlines the crash-prevention architecture, global error boundary components, remote telemetry hooks, and environment-specific error shields of the App Factory workspace.

---

## 1. Class-Component Error Boundary

React only supports error boundary interceptors (which capture parsing and rendering errors during active user flows) inside class components through lifecycle methods. Harvi wraps the entire application root layout inside a highly resilient `ErrorBoundary` component:

```typescript
// components/ui/ErrorBoundary.tsx
import React, { Component, ComponentType, PropsWithChildren } from "react";
import { ErrorFallback, ErrorFallbackProps } from "@/components";
import { captureExceptionToRemote } from "@/lib/telemetry";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // ── 1. REMOTE TELEMETRY LOGGING TRIGGER ──
    captureExceptionToRemote(error, { stack: info.componentStack });

    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
```

---

## 2. Dynamic App Recovery (`expo reloadAppAsync()`)

When an unhandled crash occurs, standard apps crash completely to the home screen. Harvi provides a **Try Again** option that forces a hot restart of the entire JavaScript bundle using Expo's native reloader, restoring full functionality in 1 click:

```typescript
// components/ui/ErrorFallback.tsx
import React from "react";
import { reloadAppAsync } from "expo";
import { triggerHapticSelection } from "@/lib/haptics";

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleRestart = async () => {
    try {
      triggerHapticSelection();
      // Triggers a native hot-reload of the JavaScript bundle
      await reloadAppAsync(); 
    } catch (restartError) {
      console.error("Native reload failed, resetting state:", restartError);
      resetError(); // Fallback to resetting React ErrorBoundary state
    }
  };
}
```

---

## 3. Real-World Startup Scaling: Exponential Backoff & Telemetry

To prevent API servers from being bombarded by thousands of retries when the network fluctuates, Harvi implements an **Exponential Backoff query retry pattern** inside TanStack Query configurations:

```typescript
// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // A. Prevent retrying client-side validation errors
        if (error?.status === 400 || error?.status === 401 || error?.status === 403) {
          return false;
        }
        // B. Retry maximum of 3 times with progressive delays (1s -> 2s -> 4s)
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

---

## 4. AI Exception Resolution Heuristics

Future AI planning agents must utilize this decision layout when designing exception catches:

```
                  ┌──────────────────────────────┐
                  │    Select Catch Structures   │
                  └──────────────┬───────────────┘
                                 │
                  Is the crash catastrophic (renders UI unusable)?
                  ├── Yes ──► Allow bubbling to global ErrorBoundary
                  │
                  └── No  ──► Does the error happen during silent syncs?
                              ├── Yes ──► Catch silently, run dynamic column probing, log telemetry
                              └── No  ──► Catch locally, serve inline user warnings (banner)
```

---

# Anti-Patterns

*   **Silently Swallowing Exceptions (`catch {}` without logs)**: Capturing runtime errors in empty block catch scopes.
    *   *Consequence*: Makes debugging in production almost impossible. Errors remain hidden while the app behaves unpredictably. Always log exceptions to telemetry packages.
*   **Exposing System Database Internals in Production UI**: Displaying raw database constraints (e.g. `23505 duplicate key violation on constraint pk_users`) directly inside user-facing alerts.
    *   *Consequence*: Serious security compromise (exposing DB schema parameters to attackers) and complete breakdown of user visual trust.
*   **Dynamic UI rendering crash loops**: Declaring components that depend directly on unverified optional properties (`user.profile.details.avatar`).
    *   *Consequence*: Triggers silent React layout crashes on mount. Always use optional chaining operators (`?.`) or declare default state fallbacks.
*   **Unbound Promise Rejections inside hooks**: Invoking asynchronous calls inside lifecycle events without mounting explicit `.catch()` blocks.
    *   *Consequence*: Triggers OS-level unhandled exception shutdowns, instantly terminating active application sessions.
