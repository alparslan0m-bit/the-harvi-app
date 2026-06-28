// Extracted from hooks/useProgress.ts — data fetching, caching, and queue merging.

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { getQueue } from "@/lib/offlineQueue";
import { supabase } from "@/lib/supabase";

const PROGRESS_CACHE_KEY = (uid: string) => `harvi:progress:${uid}`;

const FK_CANDIDATES = [
  "lecture_id", "lec_id", "lesson_id", "topic_id", "subject_id", "content_id",
];

// ── Module-level memory cache (survives re-renders, cleared on app restart) ──

export const memCache = new Map<string, Set<string>>();
export const warmed = new Set<string>();

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

async function readCache(userId: string): Promise<Set<string> | null> {
  const raw = await AsyncStorage.getItem(PROGRESS_CACHE_KEY(userId));
  if (!raw) return null;
  try {
    return new Set(JSON.parse(raw) as string[]);
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

export async function warmMemCache(userId: string): Promise<void> {
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

export async function fetchCompletedLectures(userId: string): Promise<Set<string>> {
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

// ── Cache management ─────────────────────────────────────────────────────────

/** Force clear all progress cache for a user (used during 'Clear History'). */
export async function clearProgressCache(userId: string) {
  try {
    await AsyncStorage.removeItem(PROGRESS_CACHE_KEY(userId));
    memCache.delete(userId);
    warmed.delete(userId);
  } catch (error) {
    if (__DEV__) console.error("[clearProgressCache] Error clearing progress cache:", error);
  }
}
