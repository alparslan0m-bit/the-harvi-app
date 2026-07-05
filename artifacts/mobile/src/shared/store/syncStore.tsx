import React, { useEffect, useCallback, useRef } from "react";
import { create } from "zustand";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./authStore";
import { getQueue, pendingCount as getPendingCount, removeSynced } from "@/src/shared/services/offlineQueue";
import { supabase } from "@/src/shared/services/supabase";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  setIsOnline: (online: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  setIsOnline: (online) => set({ isOnline: online }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));

export function useSyncActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const setPendingCount = useSyncStore(s => s.setPendingCount);
  const setIsSyncing = useSyncStore(s => s.setIsSyncing);
  const flushing = useRef(false);

  const refreshCount = useCallback(async () => {
    const n = await getPendingCount(user?.id);
    setPendingCount(n);
  }, [user, setPendingCount]);

  const flush = useCallback(async () => {
    if (flushing.current || !user) return;
    
    const fullQueue = await getQueue();
    const queue = fullQueue.filter((item) => item.userId === user.id);
    if (queue.length === 0) {
      await refreshCount();
      return;
    }

    flushing.current = true;
    setIsSyncing(true);

    let anySynced = false;
    const syncedIds: string[] = [];

    try {
      for (const item of queue) {
        const { error } = await supabase.from("quiz_results").insert({
          user_id: item.userId,
          lecture_id: item.lectureId,
          score: item.score,
          total_questions: item.totalQuestions,
          correct_answers: item.correctAnswers,
          created_at: item.createdAt,
        });

        if (!error) {
          syncedIds.push(item.localId);
          anySynced = true;
        } else {
          if (__DEV__) console.error(`[useSyncSession] flush insert FAILED for item ${item.localId}:`, error);
          if (error.code && (error.code.startsWith("23") || error.code.startsWith("42") || error.code.startsWith("22"))) {
            syncedIds.push(item.localId);
          }
        }
      }

      if (syncedIds.length > 0) await removeSynced(syncedIds);
      if (anySynced) {
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["progress"] });
      }
    } finally {
      await refreshCount();
      setIsSyncing(false);
      flushing.current = false;
    }
  }, [user, queryClient, refreshCount, setIsSyncing]);

  return { refreshCount, flush };
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncStore((s) => s.isOnline);
  const { user } = useAuth();
  const { refreshCount, flush } = useSyncActions();

  useEffect(() => {
    refreshCount();
    if (isOnline && user) flush();
  }, [isOnline, user, flush, refreshCount]);

  return <>{children}</>;
}

export function useSyncStatus() {
  const state = useSyncStore();
  const actions = useSyncActions();
  return { ...state, ...actions };
}
