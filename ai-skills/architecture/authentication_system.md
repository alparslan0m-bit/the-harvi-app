# Secure Authentication & Deep-Linked OAuth System

This document outlines the security architecture, token persistence, and deep-linked OAuth configuration of the Harvi application. It provides complete, copy-pasteable solutions to common React Native authentication bugs, such as iOS SecureStore size limitations and third-party Google OAuth redirect handling in Expo.

---

## 1. The iOS SecureStore 2KB Limit (Bypassing Token Failures)

On iOS, Expo's `SecureStore` enforces a strict size limit of **2,048 bytes (2 KB)** per entry. Because Supabase JWT tokens house user metadata and scopes, they frequently exceed this size. When a token exceeds 2KB, `SecureStore` silently fails to write, resulting in users being randomly logged out upon restarting the application.

### The Solution: Transparent Token Chunking
The architecture implements a custom `SecureStoreAdapter` that transparently chunks values exceeding **1,800 bytes** into multiple entries and manages them with a `__count` ledger:

```typescript
// lib/supabase.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800; // Safely under the 2,048-byte iOS limit

function chunkKey(key: string, index: number) {
  return `${key}.__chunk_${index}`;
}

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return localStorage.getItem(key);

    // Check if the value is stored as chunked entries
    const countRaw = await SecureStore.getItemAsync(`${key}.__count`);
    if (countRaw !== null) {
      const count = parseInt(countRaw, 10);
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part === null) return null; // Corrupted chunk
        parts.push(part);
      }
      return parts.join("");
    }

    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      // Clean up stale chunk keys from previous larger values
      await SecureStore.deleteItemAsync(`${key}.__count`).catch(() => {});
    } else {
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
      }
      await SecureStore.setItemAsync(`${key}.__count`, String(chunks.length));
      // Delete old single-key entry
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }

    const countRaw = await SecureStore.getItemAsync(`${key}.__count`);
    if (countRaw !== null) {
      const count = parseInt(countRaw, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
      }
      await SecureStore.deleteItemAsync(`${key}.__count`).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },
};
```

---

## 2. Google OAuth & Native WebBrowser Integration

Standard web OAuth uses immediate window redirects, which fail or crash inside native iOS/Android environments. To support smooth Google or Apple login flows, Harvi launches social auth inside secure native sheets using Expo's `WebBrowser` and maps deep-linked return callbacks.

### Implement Google Sign-In (`context/AuthContext.tsx`)
```typescript
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession(); // Required callback handler for web fallback runs

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const signInWithGoogle = async () => {
    try {
      // Create local deep link return URL (e.g. harvi://auth/callback)
      const redirectTo = Linking.createURL("/auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Prevents browser redirect in native environments
          queryParams: { prompt: "select_account" },
        },
      });

      if (error || !data.url) {
        return { error: error?.message ?? "Could not launch auth session" };
      }

      // Open OAuth provider in secure browser sheet
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        // Exchange deep link parameters for dynamic auth session
        return handleAuthCallback(result.url);
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return { error: null, cancelled: true };
      }

      return { error: "Authorization incomplete" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Authentication failed" };
    }
  };
}
```

---

## 3. Deep-Link Callback Parsing & Session Exchange

When a user finishes OAuth, the native sheet redirects to the deep link scheme (`harvi://auth/callback?code=...`). The client parses the code and completes the session exchange:

```typescript
function parseOAuthUrl(url: string): URLSearchParams {
  const hashPart = url.split("#")[1] ?? "";
  const queryPart = url.split("?")[1]?.split("#")[0] ?? "";
  return new URLSearchParams(hashPart || queryPart);
}

async function handleAuthCallback(url: string): Promise<{ error: string | null }> {
  const params = parseOAuthUrl(url);
  const code = params.get("code");

  if (code) {
    // PKCE flow session exchange
    const { error } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(code));
    return { error: error?.message ?? null };
  }

  // Implicit flow fallback
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: error?.message ?? null };
  }

  return { error: "No session codes in response callback" };
}
```

---

## 4. Deep-Link Listener Lifecycle

To capture redirects when the app is launched from a cold start or running in the background, a global deep-link listener is mounted at the root Auth Provider level:

```typescript
useEffect(() => {
  const processUrl = async (url: string) => {
    if (url.includes("access_token") || url.includes("code=")) {
      await handleAuthCallback(url);
    }
  };

  // Listen to background deep links
  const subscription = Linking.addEventListener("url", ({ url }) => processUrl(url));

  // Capture cold start deep links
  Linking.getInitialURL().then((url) => {
    if (url) processUrl(url);
  });

  return () => subscription.remove();
}, []);
```
