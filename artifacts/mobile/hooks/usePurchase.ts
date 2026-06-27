// artifacts/mobile/hooks/usePurchase.ts
// Thin hook wrapping PurchaseContext for the purchase screen.
// Provides a unified status state machine for both IAP and code redemption flows.
import { useState, useCallback } from "react";
import type { PurchasesPackage } from "react-native-purchases";
import { usePurchaseContext } from "@/context/PurchaseContext";

export type PurchaseStatus = "idle" | "loading" | "success" | "error";

export function usePurchase() {
  const { purchaseModule, purchaseSubject, redeemCode, restoreModule } = usePurchaseContext();
  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);

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

  const buySubject = useCallback(
    async (subjectId: string, rcPackage: PurchasesPackage) => {
      setStatus("loading");
      setError(null);

      const result = await purchaseSubject(subjectId, rcPackage);

      if (result.success) {
        setStatus("success");
        return { success: true };
      }

      if (!result.error) {
        setStatus("idle");
        return { success: false, cancelled: true };
      }

      setError(result.error);
      setStatus("error");
      return { success: false, error: result.error };
    },
    [purchaseSubject],
  );

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

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { buyModule, buySubject, submitCode, restorePurchase, status, error, reset };
}
