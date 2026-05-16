/**
 * SyncContext — watches network state and drains the offline quiz-result
 * queue as soon as the device comes back online.
 *
 * Exposes:
 *   isOnline      — current network state
 *   isSyncing     — queue flush in progress
 *   pendingCount  — number of results waiting to be synced
 */
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getQueue,
  pendingCount as getPendingCount,
  removeSynced,
} from "@/lib/offlineQueue";
import { writeProgressCache } from "@/hooks/useProgress";
import { supabase } from "@/lib/supabase";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface SyncCtx {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  flush: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

const Ctx = createContext<SyncCtx>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  flush: async () => {},
  refreshCount: async () => {},
});

export function useSyncStatus() {
  return useContext(Ctx);
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useNetworkStatus();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const flushing = useRef(false);

  // Keep pendingCount fresh
  const refreshCount = useCallback(async () => {
    const n = await getPendingCount();
    setPendingCount(n);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const flush = useCallback(async () => {
    if (flushing.current || !user) return;
    const queue = await getQueue();
    if (queue.length === 0) return;

    flushing.current = true;
    setIsSyncing(true);

    let anySynced = false;

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
        await removeSynced([item.localId]);
        anySynced = true;
      } else {
        console.error(
          `[SyncContext] flush insert FAILED for item ${item.localId}:`,
          JSON.stringify(error),
        );
      }
    }

    if (anySynced) {
      // The invalidation below will re-fetch and naturally overwrite the progress cache
      // without aggressively blanking it to an empty Set first.
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    }

    await refreshCount();
    setIsSyncing(false);
    flushing.current = false;
  }, [user, queryClient, refreshCount]);

  // Auto-flush when we come back online
  const prevOnline = useRef(isOnline);
  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      flush();
    }
    prevOnline.current = isOnline;
  }, [isOnline, flush]);

  // Also attempt flush on mount (in case app reopened with pending queue)
  useEffect(() => {
    if (isOnline && user) {
      flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Ctx.Provider value={{ isOnline, isSyncing, pendingCount, flush, refreshCount }}>
      {children}
    </Ctx.Provider>
  );
}
