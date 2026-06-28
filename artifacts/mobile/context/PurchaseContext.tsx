// artifacts/mobile/context/PurchaseContext.tsx
// Initializes RevenueCat and provides IAP + code redemption methods.
// RevenueCat handles receipt validation for both stores;
// after a purchase, we record it in our DB via the record-iap edge function.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// Set these in your .env or replace with actual keys from RevenueCat dashboard
const REVENUECAT_IOS_KEY = process.env["EXPO_PUBLIC_REVENUECAT_IOS_KEY"] ?? "";
const REVENUECAT_ANDROID_KEY = process.env["EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"] ?? "";

interface PurchaseContextType {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  purchaseModule: (
    moduleId: string,
    rcPackage: PurchasesPackage,
  ) => Promise<{ success: boolean; error?: string }>;
  purchaseSubject: (
    subjectId: string,
    rcPackage: PurchasesPackage,
  ) => Promise<{ success: boolean; error?: string }>;
  redeemCode: (
    code: string,
  ) => Promise<{ success: boolean; itemName?: string; error?: string }>;
  restorePurchases: () => Promise<void>;
  restoreModule: (
    moduleId: string,
    productId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // ── Initialize RevenueCat ──────────────────────────────────
  useEffect(() => {
    const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

    if (!apiKey || Platform.OS === "web") {
      // RevenueCat not available on web — mark ready anyway so code redemption works
      setIsReady(true);
      return;
    }

    const init = async () => {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        Purchases.configure({ apiKey, appUserID: user?.id ?? null });

        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        setIsReady(true);
      } catch (e) {
        console.error("[PurchaseContext] Init error:", e);
        setIsReady(true); // Still allow code redemption even if RC fails
      }
    };

    init();
  }, [user?.id]);

  // ── Sync RevenueCat user ID when auth changes ─────────────
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
        console.error("[PurchaseContext] Sync error:", e);
      }
    };

    sync();
  }, [user?.id, isReady]);

  // ── Invalidate caches after any purchase/redemption ────────
  const invalidateAccess = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["content_access"] });
    await queryClient.invalidateQueries({ queryKey: ["my_purchases"] });
    await queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
    await queryClient.invalidateQueries({ queryKey: ["quiz"] });
  }, [queryClient]);

  // ── Record IAP in our DB ──────────────────────────────────
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

  // ── Purchase a module via IAP ─────────────────────────────
  const purchaseModule = useCallback(
    async (moduleId: string, rcPackage: PurchasesPackage) => {
      try {
        const { customerInfo: info } = await Purchases.purchasePackage(rcPackage);
        setCustomerInfo(info);

        const store: "apple_iap" | "google_play" =
          Platform.OS === "ios" ? "apple_iap" : "google_play";

        // The transaction ID from the latest transaction
        const txId =
          info.nonSubscriptionTransactions?.[
            info.nonSubscriptionTransactions.length - 1
          ]?.transactionIdentifier ?? rcPackage.identifier;

        await recordIAP({ moduleId, transactionId: txId, store });
        await invalidateAccess();

        return { success: true };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          if ("userCancelled" in e && e.userCancelled) {
            return { success: false };
          }
          if ("message" in e && typeof e.message === "string") {
            return { success: false, error: e.message };
          }
        }
        return { success: false, error: "Purchase failed" };
      }
    },
    [recordIAP, invalidateAccess],
  );

  // ── Purchase a subject via IAP ────────────────────────────
  const purchaseSubject = useCallback(
    async (subjectId: string, rcPackage: PurchasesPackage) => {
      try {
        const { customerInfo: info } = await Purchases.purchasePackage(rcPackage);
        setCustomerInfo(info);

        const store: "apple_iap" | "google_play" =
          Platform.OS === "ios" ? "apple_iap" : "google_play";

        const txId =
          info.nonSubscriptionTransactions?.[
            info.nonSubscriptionTransactions.length - 1
          ]?.transactionIdentifier ?? rcPackage.identifier;

        await recordIAP({ subjectId, transactionId: txId, store });
        await invalidateAccess();

        return { success: true };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          if ("userCancelled" in e && e.userCancelled) {
            return { success: false };
          }
          if ("message" in e && typeof e.message === "string") {
            return { success: false, error: e.message };
          }
        }
        return { success: false, error: "Purchase failed" };
      }
    },
    [recordIAP, invalidateAccess],
  );

  // ── Redeem an access code ─────────────────────────────────
  const redeemCode = useCallback(
    async (code: string) => {
      try {
        const { data, error } = await supabase.rpc("redeem_access_code", {
          p_code: code,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data || typeof data !== "object") {
          return { success: false, error: "Invalid response from server" };
        }
        
        const success = "success" in data ? Boolean(data.success) : false;
        const resultError = "error" in data && typeof data.error === "string" ? data.error : undefined;
        const itemName = "item_name" in data && typeof data.item_name === "string" ? data.item_name : undefined;

        if (!success) {
          return { success: false, error: resultError ?? "Redemption failed" };
        }

        await invalidateAccess();
        return { success: true, itemName };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null && "message" in e && typeof e.message === "string") {
          return { success: false, error: e.message };
        }
        return { success: false, error: "Redemption failed" };
      }
    },
    [invalidateAccess],
  );

  // ── Restore purchases ─────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
    } catch (e) {
      console.error("[PurchaseContext] Restore error:", e);
    }
  }, []);

  // ── Restore module purchase specifically ──────────────────
  const restoreModule = useCallback(
    async (moduleId: string, productId: string) => {
      if (Platform.OS === "web") {
        return { success: false, error: "Not available on web" };
      }
      try {
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);

        const isPurchased = info.allPurchasedProductIdentifiers.includes(productId);
        if (isPurchased) {
          const txId =
            info.nonSubscriptionTransactions.find(
              (t) => t.productIdentifier === productId,
            )?.transactionIdentifier ?? `restored_${productId}`;

          const store: "apple_iap" | "google_play" =
            Platform.OS === "ios" ? "apple_iap" : "google_play";

          await recordIAP({ moduleId, transactionId: txId, store });
          await invalidateAccess();
          return { success: true };
        }
        return { success: false, error: "No purchase found to restore for this product." };
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null && "message" in e && typeof e.message === "string") {
          return { success: false, error: e.message };
        }
        return { success: false, error: "Restore failed" };
      }
    },
    [recordIAP, invalidateAccess],
  );

  return (
    <PurchaseContext.Provider
      value={{
        isReady,
        customerInfo,
        purchaseModule,
        purchaseSubject,
        redeemCode,
        restorePurchases,
        restoreModule,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchaseContext() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchaseContext must be used within PurchaseProvider");
  return ctx;
}
