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
}

const Ctx = createContext<SyncCtx>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  flush: async () => {},
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

    const synced: string[] = [];

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
        synced.push(item.localId);
      }
    }

    if (synced.length > 0) {
      await removeSynced(synced);

      // Remaining queue may still have IDs — rebuild the progress cache
      // to exclude the just-synced items (they are now in Supabase).
      // The invalidation below will re-fetch and write a fresh cache.
      if (user?.id) {
        // Force a blank progress cache so the next fetch rebuilds from Supabase
        await writeProgressCache(user.id, new Set<string>());
      }

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
    <Ctx.Provider value={{ isOnline, isSyncing, pendingCount, flush }}>
      {children}
    </Ctx.Provider>
  );
}
