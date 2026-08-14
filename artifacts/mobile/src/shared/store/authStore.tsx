/**
 * @file authStore.tsx
 * @description Global authentication state management and orchestration.
 * Integrates Supabase Auth with Zustand, handling session persistence,
 * OAuth flows (Google), and deep link interception for auth callbacks.
 */
import React, { useEffect } from "react";
import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/src/shared/services/supabase";
import { useCacheStore } from "@/src/shared/store/cacheStore";
import {
  memCache as progressMemCache,
  warmed as progressWarmed,
} from "@/src/features/learn/services/progressService";
import {
  memCache as bestScoreMemCache,
  warmed as bestScoreWarmed,
} from "@/src/features/learn/services/bestScoreService";
import { clearAllUserCaches } from "@/src/shared/utils/cacheUtils";

WebBrowser.maybeCompleteAuthSession();

/**
 * Interface defining the properties and actions of the authentication state.
 */
interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{
    error: string | null;
    cancelled?: boolean;
  }>;
  signOut: () => Promise<void>;
}

/**
 * Parses URL query parameters or hash fragments from an OAuth redirect URL.
 * 
 * @param url - The full redirect URL containing the OAuth payload
 * @returns A URLSearchParams instance containing the parsed parameters
 */
function parseOAuthUrl(url: string): URLSearchParams {
  const hashPart = url.split("#")[1] ?? "";
  const queryPart = url.split("?")[1]?.split("#")[0] ?? "";
  return new URLSearchParams(hashPart || queryPart);
}

/**
 * Zustand store managing the user's authentication session and providing login/logout actions.
 * State changes here dictate the root navigation switch between the Auth stack and Main App stack.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  /**
   * Updates the internal session state.
   * 
   * @param session - The new Supabase session object, or null to clear it
   */
  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  /**
   * Authenticates a user using email and password.
   * 
   * @param email - The user's email address
   * @param password - The user's password
   * @returns An object containing an error message if the sign-in failed, or null if successful
   */
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  },

  /**
   * Registers a new user using email and password.
   * 
   * @param email - The user's email address
   * @param password - The user's password
   * @returns An object containing an error message if the sign-up failed, or null if successful
   */
  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  },

  /**
   * Initiates the Google OAuth flow using Expo WebBrowser.
   * Seamlessly handles redirect URLs and token exchange upon return to the app.
   * 
   * @returns An object indicating success, cancellation, or providing an error message
   */
  signInWithGoogle: async () => {
    try {
      const redirectTo = Linking.createURL("callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });

      if (error || !data.url)
        return { error: error?.message ?? "Could not start Google sign-in" };

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type === "success" && result.url) {
        const params = parseOAuthUrl(result.url);
        const code = params.get("code");
        if (code) {
          const { error: exchError } =
            await supabase.auth.exchangeCodeForSession(
              decodeURIComponent(code),
            );
          return { error: exchError?.message ?? null };
        }
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: sessError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          return { error: sessError?.message ?? null };
        }
        return { error: "Redirect URL not configured in Supabase." };
      }
      if (result.type === "cancel" || result.type === "dismiss")
        return { error: null, cancelled: true };
      return { error: "Sign-in was not completed." };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Unknown error" };
    }
  },

  /**
   * Signs the current user out.
   * Completely purges all local state, invalidates caches, and removes persistent 
   * offline data specific to this user to guarantee a clean slate and preserve security.
   */
  signOut: async () => {
    const uid = useAuthStore.getState().user?.id;
    if (uid) {
      await clearAllUserCaches(uid);
    }
    await supabase.auth.signOut();
    useCacheStore.getState().clearAll();
    progressMemCache.clear();
    progressWarmed.clear();
    bestScoreMemCache.clear();
    bestScoreWarmed.clear();
  },
}));

/**
 * Global provider that orchestrates Supabase session hydration and lifecycle tracking.
 * It mounts listeners for deep links (to catch OAuth redirect callbacks) and listens 
 * to Supabase's `onAuthStateChange` to automatically clear caches upon unauthorized/logout events.
 * 
 * Must wrap the root navigation of the app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        useCacheStore.getState().clearAll();
        progressMemCache.clear();
        progressWarmed.clear();
        bestScoreMemCache.clear();
        bestScoreWarmed.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("access_token") && !url.includes("code=")) return;
      const params = parseOAuthUrl(url);
      const code = params.get("code");
      if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session) setSession(data.session);
        return;
      }
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    };

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    return () => sub.remove();
  }, [setSession]);

  return <>{children}</>;
}

/**
 * A selective hook for consuming the Auth store.
 * 
 * @param selector - A function to extract the desired slice of state
 * @returns The selected state slice
 * 
 * @example
 * ```tsx
 * const user = useAuth(state => state.user);
 * ```
 */
export function useAuth<T>(selector: (state: AuthState) => T): T {
  return useAuthStore(selector);
}
