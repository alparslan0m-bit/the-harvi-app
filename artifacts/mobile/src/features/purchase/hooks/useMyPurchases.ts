// artifacts/mobile/hooks/useMyPurchases.ts
// Phase B (plan.md §9): the purchases cache is the `purchases` table.
import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/store/authStore";
import { supabase } from "@/src/shared/services/supabase";
import { isDeviceOnline } from "@/src/shared/utils/netInfo";

import { Purchase } from "@/src/shared/types/schemas";
import { getDb } from "@/src/db/client";

async function readCachedPurchases(userId: string): Promise<Purchase[] | null> {
  try {
    const db = await getDb();
    const rows = await db.$client.getAllAsync<{
      id: string;
      module_id: string | null;
      amount_cents: number;
      currency: string;
      status: string;
      created_at: string;
    }>(
      "SELECT id, module_id, amount_cents, currency, status, created_at FROM purchases WHERE user_id = ?",
      userId,
    );
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      id: r.id,
      module_id: r.module_id,
      amount_cents: r.amount_cents,
      currency: r.currency,
      status: r.status,
      created_at: r.created_at,
    }));
  } catch (e) {
    if (__DEV__) console.warn("[useMyPurchases] Error reading cache:", e);
    return null;
  }
}

async function writeCachedPurchases(
  userId: string,
  data: Purchase[],
): Promise<void> {
  try {
    const db = await getDb();
    await db.$client.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM purchases WHERE user_id = ?", userId);
      for (const p of data) {
        await txn.runAsync(
          "INSERT INTO purchases (id, user_id, module_id, amount_cents, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          p.id,
          userId,
          p.module_id ?? null,
          p.amount_cents,
          p.currency,
          p.status,
          p.created_at,
        );
      }
    });
  } catch (e) {
    if (__DEV__) console.warn("[useMyPurchases] Error writing cache:", e);
  }
}

async function fetchMyPurchases(userId: string): Promise<Purchase[]> {
  const net = await NetInfo.fetch();
  const isOnline = isDeviceOnline(net);

  if (!isOnline) {
    const cached = await readCachedPurchases(userId);
    if (cached) return cached;
    return [];
  }

  try {
    const queryPromise = supabase
      .from("purchases")
      .select("id, module_id, amount_cents, currency, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000),
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) throw error;
    const list: Purchase[] = (data ?? []).map((r: unknown) => {
      const rec =
        typeof r === "object" && r !== null
          ? (r as Record<string, unknown>)
          : {};
      return {
        id: String(rec["id"] ?? ""),
        module_id: rec["module_id"] ? String(rec["module_id"]) : null,
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