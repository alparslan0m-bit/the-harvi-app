// artifacts/mobile/hooks/useMyPurchases.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
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

const PURCHASES_CACHE_KEY = (uid: string) => `harvi:purchases:${uid}`;

async function readCachedPurchases(userId: string): Promise<Purchase[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PURCHASES_CACHE_KEY(userId));
    return raw ? (JSON.parse(raw) as Purchase[]) : null;
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
      .select("id, module_id, amount_cents, currency, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const list = (data ?? []) as Purchase[];
    await writeCachedPurchases(userId, list);
    return list;
  } catch (err) {
    const cached = await readCachedPurchases(userId);
    if (cached) return cached;
    throw err;
  }
}

export function useMyPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_purchases", user?.id],
    queryFn: () => fetchMyPurchases(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });
}
