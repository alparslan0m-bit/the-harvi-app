// Extracted from hooks/useModuleAccess.ts — data fetching and caching.

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { supabase } from "@/src/shared/services/supabase";
import { ContentAccessEntry, ContentAccessEntrySchema } from "@/src/shared/types/schemas";
import { z } from "zod";

const ACCESS_CACHE_KEY = (uid: string) => `harvi:access:${uid}`;

async function readCachedAccess(userId: string): Promise<Map<string, ContentAccessEntry> | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCESS_CACHE_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const schema = z.record(z.string(), ContentAccessEntrySchema);
      const result = schema.safeParse(parsed);
      if (result.success) {
        return new Map(Object.entries(result.data));
      }
    }
    return null;
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

export async function fetchContentAccess(userId: string): Promise<Map<string, ContentAccessEntry>> {
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
    const entries = z.array(ContentAccessEntrySchema).safeParse(data ?? []);
    if (entries.success) {
      for (const row of entries.data) {
        map.set(row.item_id, row);
      }
    }
    await writeCachedAccess(userId, map);
    return map;
  } catch (err) {
    const cached = await readCachedAccess(userId);
    if (cached) return cached;
    throw err;
  }
}
