// Extracted from hooks/useModuleAccess.ts — data fetching and caching.
//
// Phase B (plan.md §9): the access cache is the `access_map` table, with an
// AsyncStorage fallback until the legacy-migration flag flips.

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";
import {
  ContentAccessEntry,
  ContentAccessEntrySchema,
} from "@/src/shared/types/schemas";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import { isLegacyMigrationDone } from "@/src/db/migrationStatus";

const ACCESS_CACHE_KEY = (uid: string) => `harvi:access:${uid}`;

async function readCachedAccess(
  userId: string,
): Promise<Map<string, ContentAccessEntry> | null> {
  if (await isLegacyMigrationDone()) {
    try {
      const db = await getDb();
      const rows = await db.$client.getAllAsync<{
        item_id: string;
        item_type: string;
        has_access: number;
        is_free: number;
        price_cents: number;
      }>(
        "SELECT item_id, item_type, has_access, is_free, price_cents FROM access_map WHERE user_id = ?",
        userId,
      );
      if (rows.length === 0) return null;
      const map = new Map<string, ContentAccessEntry>();
      for (const r of rows) {
        const entry: ContentAccessEntry = {
          item_id: r.item_id,
          item_type: r.item_type as "module" | "subject",
          has_access: r.has_access === 1,
          is_free: r.is_free === 1,
          price_cents: r.price_cents,
        };
        map.set(entry.item_id, entry);
      }
      return map;
    } catch {
      return null;
    }
  }
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

async function writeCachedAccess(
  userId: string,
  map: Map<string, ContentAccessEntry>,
): Promise<void> {
  try {
    const db = await getDb();
    await db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM access_map WHERE user_id = ?", userId);
      for (const [itemId, entry] of map.entries()) {
        await txn.runAsync(
          "INSERT INTO access_map (user_id, item_id, item_type, has_access, is_free, price_cents) VALUES (?, ?, ?, ?, ?, ?)",
          userId,
          itemId,
          entry.item_type,
          entry.has_access ? 1 : 0,
          entry.is_free ? 1 : 0,
          entry.price_cents,
        );
      }
    });
  } catch {
    // best-effort
  }
  if (!(await isLegacyMigrationDone())) {
    try {
      const obj = Object.fromEntries(map.entries());
      await AsyncStorage.setItem(ACCESS_CACHE_KEY(userId), JSON.stringify(obj));
    } catch {
      // best-effort
    }
  }
}

export async function fetchContentAccess(
  userId: string,
): Promise<Map<string, ContentAccessEntry>> {
  const net = await NetInfo.fetch();
  const isOnline = isDeviceOnline(net);

  if (!isOnline) {
    const cached = await readCachedAccess(userId);
    if (cached) return cached;
    return new Map();
  }

  try {
    const rpcPromise = supabase.rpc("get_content_access_map");
    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000),
    );

    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
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
    return new Map();
  }
}