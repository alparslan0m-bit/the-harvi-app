/**
 * SyncContext — watches network state and drains the offline quiz-result
 * queue as soon as the device comes back online.
 */
import React, { createContext, useContext } from "react";
import { useSyncSession } from "@/hooks/useSyncSession";

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
  const sync = useSyncSession();

  return (
    <Ctx.Provider value={sync}>
      {children}
    </Ctx.Provider>
  );
}
