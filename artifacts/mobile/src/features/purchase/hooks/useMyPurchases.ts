// artifacts/mobile/hooks/useMyPurchases.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/store/authStore";
import { supabase } from "@/src/shared/services/supabase";

import { Purchase, PurchaseSchema } from "@/src/shared/types/schemas";
import { z } from "zod";

const PURCHASES_CACHE_KEY = (uid: string) => `harvi:purchases:${uid}`;

async function readCachedPurchases(userId: string): Promise<Purchase[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PURCHASES_CACHE_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = z.array(PurchaseSchema).safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCachedPurchases(userId: string, data: Purchase[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PURCHASES_CACHE_KEY(userId), JSON.stringify(data));
  } catch {
    // best-effort
  }
}

async function fetchMyPurchases(userId: string): Promise<Purchase[]> {
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    const cached = await readCachedPurchases(userId);
    if (cached) return cached;
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("purchases")
      .select("id, module_id, subject_id, amount_cents, currency, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const list: Purchase[] = (data ?? []).map((r) => {
      const rec = typeof r === "object" && r !== null ? (r as Record<string, unknown>) : {};
      return {
        id: String(rec["id"] ?? ""),
        module_id: rec["module_id"] ? String(rec["module_id"]) : null,
        subject_id: rec["subject_id"] ? String(rec["subject_id"]) : null,
        amount_cents: Number(rec["amount_cents"] ?? 0),
        currency: String(rec["currency"] ?? ""),
        status: String(rec["status"] ?? ""),
        created_at: String(rec["created_at"] ?? ""),
      };
    });
    await writeCachedPurchases(userId, list);
    return list;
  } catch (err) {
    const cached = await readCachedPurchases(userId);
    if (cached) return cached;
    throw err;
  }
}

export function useMyPurchases() {
  const user = useAuth((s) => s.user);

  return useQuery({
    queryKey: ["my_purchases", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not logged in");
      return fetchMyPurchases(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });
}
