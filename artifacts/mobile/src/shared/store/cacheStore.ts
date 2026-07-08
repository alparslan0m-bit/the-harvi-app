import { create } from "zustand";
import { UserStats } from "@/src/shared/types/schemas";

interface CacheState {
  statsCache: Map<string, UserStats>;
  warmedStats: Set<string>;
  questionCacheBypassed: boolean;
  setStatsCache: (userId: string, stats: UserStats) => void;
  setWarmed: (userId: string) => void;
  setQuestionCacheBypassed: (bypassed: boolean) => void;
  clearAll: () => void;
  clearStatsCacheForUser: (userId: string) => void;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  statsCache: new Map(),
  warmedStats: new Set(),
  questionCacheBypassed: false,
  setStatsCache: (userId, stats) => {
    const newCache = new Map(get().statsCache);
    newCache.set(userId, stats);
    set({ statsCache: newCache });
  },
  setWarmed: (userId) => {
    const newWarmed = new Set(get().warmedStats);
    newWarmed.add(userId);
    set({ warmedStats: newWarmed });
  },
  setQuestionCacheBypassed: (bypassed) => set({ questionCacheBypassed: bypassed }),
  clearAll: () => set({ statsCache: new Map(), warmedStats: new Set(), questionCacheBypassed: false }),
  clearStatsCacheForUser: (userId) => {
    const newCache = new Map(get().statsCache);
    newCache.delete(userId);
    const newWarmed = new Set(get().warmedStats);
    newWarmed.delete(userId);
    set({ statsCache: newCache, warmedStats: newWarmed });
  },
}));
