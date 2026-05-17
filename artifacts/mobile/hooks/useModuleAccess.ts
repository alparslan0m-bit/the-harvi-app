// artifacts/mobile/hooks/useModuleAccess.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export interface ContentAccessEntry {
  item_id: string;
  item_type: 'module' | 'subject';
  has_access: boolean;
  is_free: boolean;
  price_cents: number;
}

const ACCESS_CACHE_KEY = (uid: string) => `harvi:access:${uid}`;

async function readCachedAccess(userId: string): Promise<Map<string, ContentAccessEntry> | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCESS_CACHE_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, ContentAccessEntry>;
    return new Map(Object.entries(parsed));
  } catch {
    return null;
  }
}

async function writeCachedAccess(userId: string, map: Map<string, ContentAccessEntry>): Promise<void> {
  try {
    const obj = Object.fromEntries(map.entries());
    await AsyncStorage.setItem(ACCESS_CACHE_KEY(userId), JSON.stringify(obj));
  } catch {
    // best-effort
  }
}

async function fetchContentAccess(userId: string): Promise<Map<string, ContentAccessEntry>> {
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    const cached = await readCachedAccess(userId);
    if (cached) return cached;
    throw new Error("You are offline.");
  }

  try {
    const { data, error } = await supabase.rpc("get_content_access_map");
    if (error) throw error;

    const map = new Map<string, ContentAccessEntry>();
    for (const row of (data ?? []) as ContentAccessEntry[]) {
      map.set(row.item_id, row);
    }
    await writeCachedAccess(userId, map);
    return map;
  } catch (err) {
    const cached = await readCachedAccess(userId);
    if (cached) return cached;
    throw err;
  }
}

export function useModuleAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content_access", user?.id],
    queryFn: () => fetchContentAccess(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,    // 5 min — invalidated after purchase
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    networkMode: "offlineFirst",
    retry: 0,
  });
}
