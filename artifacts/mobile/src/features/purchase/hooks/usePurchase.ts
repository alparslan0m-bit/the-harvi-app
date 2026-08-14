/**
 * @file usePurchase.ts
 * @description Hook managing the purchase screen state machine.
 * Wraps global RevenueCat and promo-code actions (`purchaseModule`, `redeemCode`, `restoreModule`)
 * with localized loading, error, and success state tracking for the UI.
 */
import { useState, useCallback } from "react";
import type { PurchasesPackage } from "react-native-purchases";
import { usePurchaseActions } from "@/src/shared/store/purchaseStore";

/** State machine status union for purchasing flows */
export type PurchaseStatus = "idle" | "loading" | "success" | "error";

/**
 * Custom React hook for driving the purchase, redemption, and restore UI.
 * 
 * @returns Object containing async trigger methods (`buyModule`, `submitCode`, `restorePurchase`),
 * localized status/error state, and a state reset callback.
 */
export function usePurchase() {
  const { purchaseModule, redeemCode, restoreModule } = usePurchaseActions();
  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * Triggers an in-app purchase for a module using RevenueCat.
   * 
   * @param moduleId - The local module ID being unlocked
   * @param rcPackage - The RevenueCat package selected by the user
   */
  const buyModule = useCallback(
    async (moduleId: string, rcPackage: PurchasesPackage) => {
      setStatus("loading");
      setError(null);

      const result = await purchaseModule(moduleId, rcPackage);

      if (result.success) {
        setStatus("success");
        return { success: true };
      }

      // User cancelled — return to idle silently
      if (!result.error) {
        setStatus("idle");
        return { success: false, cancelled: true };
      }

      setError(result.error);
      setStatus("error");
      return { success: false, error: result.error };
    },
    [purchaseModule],
  );

  /**
   * Redeems a promotional or offline activation code.
   * 
   * @param code - The raw activation code string
   */
  const submitCode = useCallback(
    async (code: string) => {
      setStatus("loading");
      setError(null);

      const result = await redeemCode(code);

      if (result.success) {
        setStatus("success");
        return { success: true, itemName: result.itemName };
      }

      setError(result.error ?? "Invalid code");
      setStatus("error");
      return { success: false, error: result.error };
    },
    [redeemCode],
  );

  /**
   * Restores a previously purchased module.
   * 
   * @param moduleId - The local module ID
   * @param productId - The App Store / Play Store product identifier
   */
  const restorePurchase = useCallback(
    async (moduleId: string, productId: string) => {
      setStatus("loading");
      setError(null);

      const result = await restoreModule(moduleId, productId);

      if (result.success) {
        setStatus("success");
        return { success: true };
      }

      setError(result.error ?? "No purchases found to restore.");
      setStatus("error");
      return { success: false, error: result.error };
    },
    [restoreModule],
  );

  /** Resets the hook's internal status back to 'idle' and clears error state */
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { buyModule, submitCode, restorePurchase, status, error, reset };
}
