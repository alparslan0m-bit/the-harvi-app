# Logging Strategy: Clean Console & Production Guards

This document defines the logging standards, console isolation rules, and production guards of the Harvi application.

---

## 1. Production Console Isolation

In React Native applications, leaving active `console.log` statements in production code slows down the main JavaScript thread, as it continually flushes strings to device log buffers. To prevent performance drops and protect sensitive user parameters (like emails or session tokens), Harvi disables standard logging methods in production builds.

### Global Logger Setup (`lib/logger.ts`)
```typescript
const isDev = __DEV__;

export const logger = {
  log(...args: any[]) {
    if (isDev) {
      console.log("[LOG]", ...args);
    }
  },
  warn(...args: any[]) {
    if (isDev) {
      console.warn("[WARN]", ...args);
    }
  },
  error(...args: any[]) {
    // Always log errors to the console, even in production, to help capture crashes
    console.error("[ERROR]", ...args);
  },
};
```

---

## 2. Dynamic console overriding

To catch accidental direct `console.log` calls that bypass the wrapper, the root initialization script overrides default global console methods during production builds:

```typescript
// app/_layout.tsx
if (!__DEV__) {
  // Override console methods to prevent accidental log leaks in production
  global.console.log = () => {};
  global.console.info = () => {};
  global.console.warn = () => {};
}
```

---

## 3. Logging Rules & Guidelines

1.  **Never log sensitive auth data**: Never log raw passwords, JWT tokens, Stripe session IDs, or private user details. If you need to debug auth states, log only semantic success indicators (e.g. `logger.log("Auth exchange successful")`).
2.  **Use specific prefixes**: Prefix your logs (e.g. `[Sync]`, `[Auth]`, `[Cache]`) to make debugging and sorting entries inside log consoles simpler.
3.  **Correct Console Method Usage**: Use the appropriate console method for each type of log. Use `logger.error` for database transaction issues, `logger.warn` for cache misses, and `logger.log` for standard screen transitions.
