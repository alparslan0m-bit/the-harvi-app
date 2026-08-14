/**
 * @file cacheStore.ts
 * @description Centralized Zustand memory-cache store for transient user statistics 
 * and question cache bypass flags. Provides synchronous access to cached metrics 
 * across UI re-renders without waiting for asynchronous disk reads.
 */
import { create } from "zustand";
import { UserStats } from "@/src/shared/types/schemas";

/**
 * Interface defining the memory cache state and updater actions.
 */
interface CacheState {
  /** Map of User ID -> UserStats in memory */
  statsCache: Map<string, UserStats>;
  /** Set of User IDs whose caches have been warmed from disk */
  warmedStats: Set<string>;
  /** Flag to bypass local question caching (useful for debugging/testing) */
  questionCacheBypassed: boolean;
  setStatsCache: (userId: string, stats: UserStats) => void;
  setWarmed: (userId: string) => void;
  setQuestionCacheBypassed: (bypassed: boolean) => void;
  clearAll: () => void;
  clearStatsCacheForUser: (userId: string) => void;
}

/**
 * Zustand store providing synchronous memory cache access and invalidation actions.
 */
export const useCacheStore = create<CacheState>((set, get) => ({
  statsCache: new Map(),
  warmedStats: new Set(),
  questionCacheBypassed: false,

  /** Saves a user's stats object to the memory map */
  setStatsCache: (userId, stats) => {
    const newCache = new Map(get().statsCache);
    newCache.set(userId, stats);
    set({ statsCache: newCache });
  },

  /** Marks a user's stats as warmed from disk */
  setWarmed: (userId) => {
    const newWarmed = new Set(get().warmedStats);
    newWarmed.add(userId);
    set({ warmedStats: newWarmed });
  },

  /** Toggles the question cache bypass setting */
  setQuestionCacheBypassed: (bypassed) =>
    set({ questionCacheBypassed: bypassed }),

  /** Completely resets all memory caches */
  clearAll: () =>
    set({
      statsCache: new Map(),
      warmedStats: new Set(),
      questionCacheBypassed: false,
    }),

  /** Removes stats cache for a specific user */
  clearStatsCacheForUser: (userId) => {
    const newCache = new Map(get().statsCache);
    newCache.delete(userId);
    const newWarmed = new Set(get().warmedStats);
    newWarmed.delete(userId);
    set({ statsCache: newCache, warmedStats: newWarmed });
  },
}));
