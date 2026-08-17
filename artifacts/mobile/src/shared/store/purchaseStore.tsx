/**
 * @file purchaseStore.tsx
 * @description RevenueCat and In-App Purchase (IAP) orchestration store.
 * Manages native RevenueCat SDK initialization, user identification mapping,
 * receipt recording via Supabase Edge Functions, and activation code redemptions.
 */
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
const REVENUECAT_ANDROID_KEY =
  process.env["EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"] ?? "";

/** State model for RevenueCat readiness and customer info */
interface PurchaseState {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  setIsReady: (ready: boolean) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
}

/**
 * Zustand store managing RevenueCat readiness state and active customer entitlement info.
 */
export const usePurchaseStore = create<PurchaseState>((set) => ({
  isReady: false,
  customerInfo: null,
  setIsReady: (ready) => set({ isReady: ready }),
  setCustomerInfo: (info) => set({ customerInfo: info }),
}));

/**
 * Custom hook providing actions for executing purchases, code redemptions, and restores.
 */
export function usePurchaseActions() {
  const queryClient = useQueryClient();
  const setCustomerInfo = usePurchaseStore((s) => s.setCustomerInfo);

  /** Invalidates React Query caches related to module access and user purchases */
  const invalidateAccess = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["content_access"] });
    await queryClient.invalidateQueries({ queryKey: ["my_purchases"] });
    await queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
    await queryClient.invalidateQueries({ queryKey: ["quiz"] });
  }, [queryClient]);

  /** Invokes the `record-iap` Edge Function to record the transaction server-side */
  const recordIAP = useCallback(
    async (params: {
      moduleId: string;
      transactionId: string;
      store: "apple_iap" | "google_play";
    }) => {
      const invokePromise = supabase.functions.invoke("record-iap", {
        body: {
          module_id: params.moduleId,
          transaction_id: params.transactionId,
          store: params.store,
        },
      });

      const timeoutPromise = new Promise<{ data: any; error: any }>(
        (_, reject) => setTimeout(() => reject(new Error("timeout")), 15000),
      );

      const { data, error } = await Promise.race([
        invokePromise,
        timeoutPromise,
      ]);

      if (error) throw new Error(error.message);
      return data;
    },
    [],
  );

  /**
   * Executes a package purchase via RevenueCat and records the transaction in Supabase.
   * 
   * @param moduleId - The target module ID
   * @param rcPackage - The selected RevenueCat package
   */
  const purchaseModule = useCallback(
    async (moduleId: string, rcPackage: PurchasesPackage) => {
      try {
        const { customerInfo: info, transaction } =
          await Purchases.purchasePackage(rcPackage);
        setCustomerInfo(info);
        const store = Platform.OS === "ios" ? "apple_iap" : "google_play";
        const txId = transaction?.transactionIdentifier ?? rcPackage.identifier;
        await recordIAP({ moduleId, transactionId: txId, store });
        await invalidateAccess();
        return { success: true };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          const err = e as Record<string, unknown>;
          if (err["userCancelled"]) return { success: false };
          if (typeof err["message"] === "string")
            return { success: false, error: err["message"] };
        }
        return { success: false, error: "Purchase failed" };
      }
    },
    [recordIAP, invalidateAccess, setCustomerInfo],
  );

  /**
   * Redeems a promo activation code via the Supabase `redeem_access_code` RPC function.
   * 
   * @param code - The promotional activation string
   */
  const redeemCode = useCallback(
    async (code: string) => {
      try {
        const rpcPromise = supabase.rpc("redeem_access_code", { p_code: code });
        const timeoutPromise = new Promise<{ data: any; error: any }>(
          (_, reject) => setTimeout(() => reject(new Error("timeout")), 15000),
        );
        const { data, error } = await Promise.race([
          rpcPromise,
          timeoutPromise,
        ]);
        if (error) return { success: false, error: error.message };
        if (!data || typeof data !== "object")
          return { success: false, error: "Invalid response from server" };

        const responseData = data as Record<string, unknown>;
        const success = Boolean(responseData["success"]);
        const resultError =
          typeof responseData["error"] === "string"
            ? responseData["error"]
            : undefined;
        const itemName =
          typeof responseData["item_name"] === "string"
            ? responseData["item_name"]
            : undefined;

        if (!success)
          return { success: false, error: resultError ?? "Redemption failed" };
        await invalidateAccess();
        return { success: true, itemName };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          const err = e as Record<string, unknown>;
          if (typeof err["message"] === "string")
            return { success: false, error: err["message"] };
        }
        return { success: false, error: "Redemption failed" };
      }
    },
    [invalidateAccess],
  );

  /** Restores previous purchases from App Store / Play Store */
  const restorePurchases = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
    } catch (e) {
      console.error("[PurchaseStore] Restore error:", e);
    }
  }, [setCustomerInfo]);

  /** Restores a specific module purchase and syncs server state */
  const restoreModule = useCallback(
    async (moduleId: string, productId: string) => {
      if (Platform.OS === "web")
        return { success: false, error: "Not available on web" };
      try {
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        const isPurchased =
          info.allPurchasedProductIdentifiers.includes(productId);
        if (isPurchased) {
          // Use the real store transaction id so the edge function's RevenueCat
          // validation (store_transaction_id OR product_identifier) passes.
          // `restored_${productId}` could never match either (audit P2-12).
          const txId =
            info.nonSubscriptionTransactions.find(
              (t) => t.productIdentifier === productId,
            )?.transactionIdentifier ?? productId;
          const store = Platform.OS === "ios" ? "apple_iap" : "google_play";
          await recordIAP({ moduleId, transactionId: txId, store });
          await invalidateAccess();
          return { success: true };
        }
        return {
          success: false,
          error: "No purchase found to restore for this product.",
        };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          const err = e as Record<string, unknown>;
          if (typeof err["message"] === "string")
            return { success: false, error: err["message"] };
        }
        return { success: false, error: "Restore failed" };
      }
    },
    [recordIAP, invalidateAccess, setCustomerInfo],
  );

  return React.useMemo(
    () => ({
      purchaseModule,
      redeemCode,
      restorePurchases,
      restoreModule,
    }),
    [purchaseModule, redeemCode, restorePurchases, restoreModule],
  );
}

/**
 * Provider that configures native RevenueCat SDK and maps Supabase User IDs to RevenueCat App User IDs.
 * Should wrap the root navigator.
 */
export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const setIsReady = usePurchaseStore((s) => s.setIsReady);
  const setCustomerInfo = usePurchaseStore((s) => s.setCustomerInfo);
  const isReady = usePurchaseStore((s) => s.isReady);

  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  const IS_REVENUECAT_ENABLED = Boolean(Platform.OS !== "web" && apiKey);

  useEffect(() => {
    if (!IS_REVENUECAT_ENABLED) {
      setIsReady(true);
      return;
    }
    const init = async () => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey, appUserID: null }); // Configure exactly once
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        setIsReady(true);
      } catch (e) {
        console.error("[PurchaseStore] Init error:", e);
        setIsReady(true);
      }
    };
    init();
  }, [apiKey, setIsReady, setCustomerInfo, IS_REVENUECAT_ENABLED]);

  useEffect(() => {
    if (!isReady || !IS_REVENUECAT_ENABLED) return;
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
  }, [user?.id, isReady, setCustomerInfo, IS_REVENUECAT_ENABLED]);

  return <>{children}</>;
}
