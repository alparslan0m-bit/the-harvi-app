# Reference: Client Hooks (React Native / Expo)

Drop these into `artifacts/mobile/hooks/`. They integrate with the existing
React Query and Supabase setup already in the codebase.

---

## `useModuleAccess.ts`

Returns a map of module IDs to access flags. Used to render lock icons
on `ModuleCard` without exposing `purchases` table directly.

```typescript
// artifacts/mobile/hooks/useModuleAccess.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export interface ModuleAccessEntry {
  module_id: string;
  has_access: boolean;
  is_free: boolean;
}

async function fetchModuleAccess(): Promise<Map<string, ModuleAccessEntry>> {
  const { data, error } = await supabase.rpc("get_module_access_map");
  if (error) throw error;

  const map = new Map<string, ModuleAccessEntry>();
  for (const row of (data ?? []) as ModuleAccessEntry[]) {
    map.set(row.module_id, row);
  }
  return map;
}

export function useModuleAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["module_access", user?.id],
    queryFn: fetchModuleAccess,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,    // 5 min — invalidated after purchase
    gcTime: 1000 * 60 * 60,
    networkMode: "offlineFirst",
    retry: 1,
  });
}
```

---

## `usePurchase.ts`

Handles the full purchase lifecycle: create checkout → redirect → verify.

```typescript
// artifacts/mobile/hooks/usePurchase.ts
import { useState, useCallback } from "react";
import { Linking } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

export type PurchaseStatus = "idle" | "loading" | "redirecting" | "verifying" | "success" | "error";

export function usePurchase() {
  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const purchaseModule = useCallback(async (moduleId: string) => {
    setStatus("loading");
    setError(null);

    try {
      // 1. Create Checkout Session via Edge Function
      const successUrl = Linking.createURL("/purchase/success");
      const cancelUrl = Linking.createURL("/purchase/cancel");

      const { data, error: invokeError } = await supabase.functions.invoke("create-checkout", {
        body: {
          module_id: moduleId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      });

      if (invokeError || !data?.url) {
        throw new Error(invokeError?.message ?? "Failed to create checkout");
      }

      // 2. Open Stripe Checkout
      setStatus("redirecting");
      const result = await WebBrowser.openAuthSessionAsync(data.url, successUrl);

      if (result.type !== "success") {
        setStatus("idle");
        return { success: false, cancelled: true };
      }

      // 3. Extract session_id from redirect URL
      const url = new URL(result.url);
      const sessionId = url.searchParams.get("session_id");

      if (!sessionId) {
        throw new Error("No session_id in redirect URL");
      }

      // 4. Verify purchase with Edge Function
      setStatus("verifying");
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-purchase",
        { body: { session_id: sessionId } }
      );

      if (verifyError) throw new Error(verifyError.message);

      if (verifyData?.status === "active") {
        // 5. Invalidate access caches so UI updates immediately
        await queryClient.invalidateQueries({ queryKey: ["module_access"] });
        await queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
        await queryClient.invalidateQueries({ queryKey: ["quiz"] });
        setStatus("success");
        return { success: true, moduleId: verifyData.module_id };
      } else {
        // Payment pending (e.g. bank transfer)
        setStatus("idle");
        return { success: false, pending: true };
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      setError(message);
      setStatus("error");
      return { success: false, error: message };
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { purchaseModule, status, error, reset };
}
```

---

## `useMyPurchases.ts`

Lists the user's own purchases. Used in a "My Purchases" screen.

```typescript
// artifacts/mobile/hooks/useMyPurchases.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export interface Purchase {
  id: string;
  module_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

async function fetchMyPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, module_id, amount_cents, currency, status, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Purchase[];
}

export function useMyPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_purchases", user?.id],
    queryFn: fetchMyPurchases,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
  });
}
```

---

## Updated `ModuleCard.tsx` — Add Lock Icon

Modify the existing `ModuleCard` to show lock/unlock state:

```typescript
// In ModuleCard.tsx — add to Props
interface Props {
  module: Module;
  index: number;
  onPress: () => void;
  hasAccess?: boolean;   // NEW
  isFree?: boolean;      // NEW
}

// In component — add lock badge
{!hasAccess && !isFree && (
  <View style={[styles.lockBadge, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
    <Feather name="lock" size={14} color="#fff" />
  </View>
)}

{isFree && (
  <View style={[styles.freeBadge, { backgroundColor: colors.success }]}>
    <Text style={styles.freeBadgeText}>FREE</Text>
  </View>
)}

// styles
lockBadge: {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3,
},
freeBadge: {
  position: 'absolute',
  top: 16,
  right: 16,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 10,
  zIndex: 3,
},
freeBadgeText: {
  color: '#fff',
  fontSize: 10,
  fontFamily: 'Inter_700Bold',
  letterSpacing: 0.5,
},
```

---

## Purchase Screen Template

```typescript
// artifacts/mobile/app/purchase/[moduleId].tsx
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePurchase } from "@/hooks/usePurchase";
import { useColors } from "@/hooks/useColors";

export default function PurchaseScreen() {
  const { moduleId, moduleName, priceDisplay } = useLocalSearchParams<{
    moduleId: string;
    moduleName: string;
    priceDisplay: string;
  }>();
  const colors = useColors();
  const { purchaseModule, status, error, reset } = usePurchase();

  const handlePurchase = async () => {
    const result = await purchaseModule(moduleId);
    if (result.success) {
      router.back();
    }
  };

  const isLoading = status === "loading" || status === "redirecting" || status === "verifying";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{moduleName}</Text>
      <Text style={[styles.price, { color: colors.primary }]}>{priceDisplay}</Text>

      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      )}

      {status === "success" ? (
        <View style={styles.successBox}>
          <Feather name="check-circle" size={40} color={colors.success} />
          <Text style={[styles.successText, { color: colors.foreground }]}>
            Purchase complete! You now have full access.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="credit-card" size={18} color="#fff" />
              <Text style={styles.btnText}>
                {status === "verifying" ? "Verifying payment..." : "Purchase Now"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 20 },
  title: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5, textAlign: "center" },
  price: { fontSize: 40, fontFamily: "Inter_700Bold" },
  btn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16 },
  btnText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  error: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  successBox: { alignItems: "center", gap: 12 },
  successText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" },
});
```
