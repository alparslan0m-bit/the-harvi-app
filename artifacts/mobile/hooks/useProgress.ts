/**
 * useProgress — returns a Set of lecture IDs the user has completed.
 *
 * Offline-first (instant, same pattern as useStats):
 *  - Module-level memCache gives synchronous initialData on every mount
 *  - NetInfo check skips Supabase entirely when offline (no timeout wait)
 *  - On success   → writes to AsyncStorage + memCache, merges queued IDs
 *  - On net error → serves last AsyncStorage snapshot + queued offline IDs
 *  - gcTime 24 h  → stays in React-Query memory for the full app session
 *  - networkMode "offlineFirst" → re-runs queryFn even without connectivity
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { getQueue } from "@/lib/offlineQueue";
import { supabase } from "@/lib/supabase";

const PROGRESS_CACHE_KEY = (uid: string) => `harvi:progress:${uid}`;

const FK_CANDIDATES = [
  "lecture_id", "lec_id", "lesson_id", "topic_id", "subject_id", "content_id",
];

// ── Module-level memory cache (survives re-renders, cleared on app restart) ──
const memCache = new Map<string, Set<string>>();

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

async function readCache(userId: string): Promise<Set<string> | null> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_CACHE_KEY(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

/** Write the completed-IDs set to AsyncStorage + memCache (best-effort). */
export async function writeProgressCache(userId: string, ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_CACHE_KEY(userId), JSON.stringify([...ids]));
    memCache.set(userId, ids);
  } catch {
    // silently ignore
  }
}

/**
 * Merge a newly-completed lectureId into the on-device progress cache
 * so the lecture card flips to "done" the instant a quiz finishes —
 * even before the result is synced to Supabase.
 */
export async function optimisticallyMarkComplete(
  userId: string,
  lectureId: string
): Promise<void> {
  const current = memCache.get(userId) ?? (await readCache(userId)) ?? new Set<string>();
  current.add(lectureId);
  await writeProgressCache(userId, current);
}

// ── Warm memory cache from AsyncStorage (called once per session) ────────────

const warmed = new Set<string>();
async function warmMemCache(userId: string): Promise<void> {
  if (warmed.has(userId)) return;
  warmed.add(userId);
  const cached = await readCache(userId);
  if (cached && !memCache.has(userId)) {
    memCache.set(userId, cached);
  }
}

// ── Queue helpers ────────────────────────────────────────────────────────────

async function queuedIds(userId: string): Promise<string[]> {
  const queue = await getQueue();
  return queue.filter((q) => q.userId === userId).map((q) => q.lectureId);
}

// ── Offline path ─────────────────────────────────────────────────────────────

async function serveFromCache(userId: string): Promise<Set<string>> {
  const cached = memCache.get(userId) ?? (await readCache(userId)) ?? new Set<string>();
  const pending = await queuedIds(userId);
  pending.forEach((id) => cached.add(id));
  // Keep memCache in sync
  memCache.set(userId, cached);
  return cached;
}

// ── Online fetch ─────────────────────────────────────────────────────────────

async function fetchCompletedLectures(userId: string): Promise<Set<string>> {
  // ── Fast offline short-circuit ───────────────────────────────────────────
  // Check connectivity BEFORE any Supabase call.
  // Without this, an offline app waits up to 30 s for the request to fail.
  const net = await NetInfo.fetch();
  const isOnline = (net.isConnected ?? false) && net.isInternetReachable !== false;

  if (!isOnline) {
    return serveFromCache(userId);
  }

  // ── Online path ──────────────────────────────────────────────────────────
  let result: Set<string> | null = null;

  try {
    for (const col of FK_CANDIDATES) {
      const { data, error } = await supabase
        .from("quiz_results")
        .select(col)
        .eq("user_id", userId);

      if (error) {
        if (error.code === "42703") continue; // column doesn't exist → try next
        throw error;                           // real error → fall through to catch
      }

      if (data && data.length > 0) {
        const ids = (data as any[])
          .map((r) => r[col])
          .filter((v) => v != null && String(v) !== "null" && String(v).length > 0)
          .map((v) => String(v));

        if (ids.length > 0) {
          result = new Set(ids);
          break;
        }
      }
    }

    if (!result) result = new Set<string>();
  } catch {
    // Network error mid-request — fall back to cache
    return serveFromCache(userId);
  }

  // Merge still-queued IDs (submitted offline, not yet synced)
  const pending = await queuedIds(userId);
  pending.forEach((id) => result!.add(id));

  // Persist for offline use + update memCache
  await writeProgressCache(userId, result);
  return result;
}

/** Force clear all progress cache for a user (used during 'Clear History'). */
export async function clearProgressCache(userId: string) {
  try {
    await AsyncStorage.removeItem(PROGRESS_CACHE_KEY(userId));
    memCache.delete(userId);
    warmed.delete(userId);
  } catch (error) {
    console.error("[clearProgressCache] Error clearing progress cache:", error);
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useProgress() {
  const { user } = useAuth();

  // Kick off async warm of memCache on first call for this user.
  // By the time they navigate to a subject, memCache will be populated.
  if (user?.id && !warmed.has(user.id)) {
    warmMemCache(user.id);
  }

  const memData = user?.id ? memCache.get(user.id) : undefined;

  const query = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => fetchCompletedLectures(user!.id),
    enabled: !!user?.id,
    // Serve last-known data synchronously — no loading spinner or blank counts
    initialData: memData,
    initialDataUpdatedAt: memData ? Date.now() - 1000 * 60 * 11 : undefined,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
    retry: 0,
  });

  return query.data ?? new Set<string>();
}

/**
 * Returns a function that immediately invalidates the progress query so
 * lecture cards refresh after a quiz finishes (online or offline).
 */
export function useRefreshProgress() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => {
    if (user?.id) qc.invalidateQueries({ queryKey: ["progress", user.id] });
  };
}
