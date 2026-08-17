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
  /** Flag to bypass local question caching (useful for debugging/testing) */
  questionCacheBypassed: boolean;
  setQuestionCacheBypassed: (bypassed: boolean) => void;
  clearAll: () => void;
}

/**
 * Zustand store providing synchronous memory cache access and invalidation actions.
 */
export const useCacheStore = create<CacheState>((set, get) => ({
  questionCacheBypassed: false,

  /** Toggles the question cache bypass setting */
  setQuestionCacheBypassed: (bypassed) =>
    set({ questionCacheBypassed: bypassed }),

  /** Completely resets all memory caches */
  clearAll: () =>
    set({
      questionCacheBypassed: false,
    }),
}));
