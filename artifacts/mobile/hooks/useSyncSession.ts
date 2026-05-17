import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getQueue,
  pendingCount as getPendingCount,
  removeSynced,
} from "@/lib/offlineQueue";
import { supabase } from "@/lib/supabase";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function useSyncSession() {
  const isOnline = useNetworkStatus();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const flushing = useRef(false);

  const refreshCount = useCallback(async () => {
    const n = await getPendingCount(user?.id);
    setPendingCount(n);
  }, [user]);

  const flush = useCallback(async () => {
    if (flushing.current || !user) return;
    
    // Check queue first to avoid unnecessary state changes
    const fullQueue = await getQueue();
    const queue = fullQueue.filter((item) => item.userId === user.id);
    if (queue.length === 0) {
      await refreshCount(); // Ensure count is 0
      return;
    }

    flushing.current = true;
    setIsSyncing(true);

    let anySynced = false;

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
          await removeSynced([item.localId]);
          anySynced = true;
        } else {
          // In dev, log the error but don't stop the loop for other items
          if (__DEV__) {
            console.error(
              `[useSyncSession] flush insert FAILED for item ${item.localId}:`,
              error
            );
          }
          // Drop items that fail with a permanent Postgres constraint error
          // to prevent poison pills from permanently blocking the queue.
          if (error.code && (error.code.startsWith("23") || error.code.startsWith("42"))) {
            await removeSynced([item.localId]);
          }
        }
      }

      if (anySynced) {
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["progress"] });
      }
    } finally {
      await refreshCount();
      setIsSyncing(false);
      flushing.current = false;
    }
  }, [user, queryClient, refreshCount]);

  // Consolidated trigger: handle mount, online transition, and user login
  useEffect(() => {
    refreshCount();
    
    if (isOnline && user) {
      flush();
    }
  }, [isOnline, user, flush, refreshCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    flush,
    refreshCount,
  };
}
