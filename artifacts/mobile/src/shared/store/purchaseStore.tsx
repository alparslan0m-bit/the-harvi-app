import React, { useEffect, useCallback } from "react";
import { create } from "zustand";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./authStore";
import { supabase } from "@/src/shared/services/supabase";

const REVENUECAT_IOS_KEY = process.env["EXPO_PUBLIC_REVENUECAT_IOS_KEY"] ?? "";
const REVENUECAT_ANDROID_KEY = process.env["EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"] ?? "";

interface PurchaseState {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  setIsReady: (ready: boolean) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
}

export const usePurchaseStore = create<PurchaseState>((set) => ({
  isReady: false,
  customerInfo: null,
  setIsReady: (ready) => set({ isReady: ready }),
  setCustomerInfo: (info) => set({ customerInfo: info }),
}));

export function usePurchaseActions() {
  const queryClient = useQueryClient();
  const setCustomerInfo = usePurchaseStore(s => s.setCustomerInfo);

  const invalidateAccess = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["content_access"] });
    await queryClient.invalidateQueries({ queryKey: ["my_purchases"] });
    await queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
    await queryClient.invalidateQueries({ queryKey: ["quiz"] });
  }, [queryClient]);

  const recordIAP = useCallback(
    async (params: {
      moduleId?: string;
      subjectId?: string;
      transactionId: string;
      store: "apple_iap" | "google_play";
    }) => {
      const { data, error } = await supabase.functions.invoke("record-iap", {
        body: {
          module_id: params.moduleId ?? null,
          subject_id: params.subjectId ?? null,
          transaction_id: params.transactionId,
          store: params.store,
        },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    [],
  );

  const purchaseModule = useCallback(
    async (moduleId: string, rcPackage: PurchasesPackage) => {
      try {
        const { customerInfo: info } = await Purchases.purchasePackage(rcPackage);
        setCustomerInfo(info);
        const store = Platform.OS === "ios" ? "apple_iap" : "google_play";
        const txId = info.nonSubscriptionTransactions?.[info.nonSubscriptionTransactions.length - 1]?.transactionIdentifier ?? rcPackage.identifier;
        await recordIAP({ moduleId, transactionId: txId, store });
        await invalidateAccess();
        return { success: true };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          if ("userCancelled" in e && (e as any).userCancelled) return { success: false };
          if ("message" in e && typeof (e as any).message === "string") return { success: false, error: (e as any).message };
        }
        return { success: false, error: "Purchase failed" };
      }
    },
    [recordIAP, invalidateAccess, setCustomerInfo],
  );

  const purchaseSubject = useCallback(
    async (subjectId: string, rcPackage: PurchasesPackage) => {
      try {
        const { customerInfo: info } = await Purchases.purchasePackage(rcPackage);
        setCustomerInfo(info);
        const store = Platform.OS === "ios" ? "apple_iap" : "google_play";
        const txId = info.nonSubscriptionTransactions?.[info.nonSubscriptionTransactions.length - 1]?.transactionIdentifier ?? rcPackage.identifier;
        await recordIAP({ subjectId, transactionId: txId, store });
        await invalidateAccess();
        return { success: true };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          if ("userCancelled" in e && (e as any).userCancelled) return { success: false };
          if ("message" in e && typeof (e as any).message === "string") return { success: false, error: (e as any).message };
        }
        return { success: false, error: "Purchase failed" };
      }
    },
    [recordIAP, invalidateAccess, setCustomerInfo],
  );

  const redeemCode = useCallback(
    async (code: string) => {
      try {
        const { data, error } = await supabase.rpc("redeem_access_code", { p_code: code });
        if (error) return { success: false, error: error.message };
        if (!data || typeof data !== "object") return { success: false, error: "Invalid response from server" };
        
        const success = "success" in data ? Boolean((data as any).success) : false;
        const resultError = "error" in data && typeof (data as any).error === "string" ? (data as any).error : undefined;
        const itemName = "item_name" in data && typeof (data as any).item_name === "string" ? (data as any).item_name : undefined;

        if (!success) return { success: false, error: resultError ?? "Redemption failed" };
        await invalidateAccess();
        return { success: true, itemName };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string") {
          return { success: false, error: (e as any).message };
        }
        return { success: false, error: "Redemption failed" };
      }
    },
    [invalidateAccess],
  );

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
    } catch (e) {
      console.error("[PurchaseStore] Restore error:", e);
    }
  }, [setCustomerInfo]);

  const restoreModule = useCallback(
    async (moduleId: string, productId: string) => {
      if (Platform.OS === "web") return { success: false, error: "Not available on web" };
      try {
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        const isPurchased = info.allPurchasedProductIdentifiers.includes(productId);
        if (isPurchased) {
          const txId = info.nonSubscriptionTransactions.find((t) => t.productIdentifier === productId)?.transactionIdentifier ?? `restored_${productId}`;
          const store = Platform.OS === "ios" ? "apple_iap" : "google_play";
          await recordIAP({ moduleId, transactionId: txId, store });
          await invalidateAccess();
          return { success: true };
        }
        return { success: false, error: "No purchase found to restore for this product." };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string") return { success: false, error: (e as any).message };
        return { success: false, error: "Restore failed" };
      }
    },
    [recordIAP, invalidateAccess, setCustomerInfo],
  );

  return { purchaseModule, purchaseSubject, redeemCode, restorePurchases, restoreModule };
}

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const setIsReady = usePurchaseStore(s => s.setIsReady);
  const setCustomerInfo = usePurchaseStore(s => s.setCustomerInfo);
  const isReady = usePurchaseStore(s => s.isReady);

  useEffect(() => {
    const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    if (!apiKey || Platform.OS === "web") {
      setIsReady(true);
      return;
    }
    const init = async () => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey, appUserID: user?.id ?? null });
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        setIsReady(true);
      } catch (e) {
        console.error("[PurchaseStore] Init error:", e);
        setIsReady(true);
      }
    };
    init();
  }, [user?.id, setIsReady, setCustomerInfo]);

  useEffect(() => {
    if (!isReady || Platform.OS === "web") return;
    const sync = async () => {
      try {
        if (user?.id) {
          const { customerInfo: info } = await Purchases.logIn(user.id);
          setCustomerInfo(info);
        } else {
          await Purchases.logOut();
          setCustomerInfo(null);
        }
      } catch (e) {
        console.error("[PurchaseStore] Sync error:", e);
      }
    };
    sync();
  }, [user?.id, isReady, setCustomerInfo]);

  return <>{children}</>;
}

export function usePurchaseContext() {
  const state = usePurchaseStore();
  const actions = usePurchaseActions();
  return { ...state, ...actions };
}
