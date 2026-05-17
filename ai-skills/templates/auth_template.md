# Auth Template: Scaffolding Blueprint for OAuth & Deep-Link Listeners

This template provides the standard secure WebBrowser OAuth triggers, PKCE callback code exchanges, and background deep-link observers required to configure robust social authentication flows in the App Factory workspace.

---

## 📂 Proposed File Path

Authentication context providers and listeners must reside in the root authentication layer. For example:

```
c:\Users\METRO\harvi gamed\
└── context/
    └── AuthContext.tsx          # Centralized Auth & deep link Orchestrator
```

---

## 💻 Code Scaffolding

```typescript
// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession(); // Required for web fallbacks

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: string | null; cancelled?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

// Helper: Parse Callback URL fragment tokens
function parseOAuthUrl(url: string): URLSearchParams {
  const hashPart = url.split("#")[1] ?? "";
  const queryPart = url.split("?")[1]?.split("#")[0] ?? "";
  return new URLSearchParams(hashPart || queryPart);
}

// Helper: Exchange codes for a secure session
async function handleAuthCallback(url: string): Promise<{ error: string | null }> {
  const params = parseOAuthUrl(url);
  const code = params.get("code");

  if (code) {
    // PKCE session exchange
    const { error } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(code));
    return { error: error?.message ?? null };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    // Implicit flow session setup
    const { error } = await supabase.auth.setSession({ 
      access_token: accessToken, 
      refresh_token: refreshToken 
    });
    return { error: error?.message ?? null };
  }

  return { error: "No valid session parameters in redirect URL" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // A. Monitor Auth Changes on Boot
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // B. Setup Deep Link Listeners for background OAuth redirects
  useEffect(() => {
    const processDeepLink = async (url: string) => {
      if (url.includes("access_token") || url.includes("code=")) {
        setLoading(true);
        await handleAuthCallback(url);
        setLoading(false);
      }
    };

    // Observers background redirects
    const sub = Linking.addEventListener("url", ({ url }) => processDeepLink(url));

    // Captures cold-start redirect launches
    Linking.getInitialURL().then((url) => {
      if (url) processDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  // C. Trigger Social OAuth Launch
  const signInWithGoogle = async () => {
    try {
      const redirectTo = Linking.createURL("/auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Crucial for native sheet views
          queryParams: { prompt: "select_account" },
        },
      });

      if (error || !data.url) throw new Error(error?.message ?? "OAuth setup failed");

      // Open in secure native WebBrowser overlay sheet
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        setLoading(true);
        const res = await handleAuthCallback(result.url);
        setLoading(false);
        return res;
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return { error: null, cancelled: true };
      }

      return { error: "Authorization flow was dismissed without resolving a session" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Google Auth failed" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Always Enforce `skipBrowserRedirect: true`**: Standard browser redirects break inside native iOS/Android environments. Always launch social OAuth inside secure WebBrowser sheets with explicit deep link schemes.
2.  **Mount Background Deep Link Observers**: Listen for redirects both during active runs (via event listeners) and cold launches (`Linking.getInitialURL()`), preventing redirect loops or stalled pages.
3.  **Strict Token Size Chunking**: To prevent silent JWT persistence crashes on iOS, pair this provider with the custom `SecureStoreAdapter` described in [authentication_system.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/architecture/authentication_system.md).

---

## 📈 Scalability Notes

*   **PKCE Flow Priority**: Prioritize PKCE code-exchange auth setups over traditional implicit flows, as it provides absolute prevention against authorization code interception attacks.
*   **Redirect URL Caching**: Keep dynamic redirect URLs locked inside environmental configuration files to prevent developer drift between Sandbox and Production clients.
