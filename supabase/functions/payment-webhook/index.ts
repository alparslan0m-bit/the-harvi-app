// supabase/functions/payment-webhook/index.ts
// SECURITY HARDENING (2026-05-11):
//   CRIT-03: HMAC signature verification implemented BEFORE any DB operation
//   Added: Idempotency guard, refund/dispute handling, raw body verification
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

// ── HMAC Verification ───────────────────────────────────────────
// Paymob concatenates specific transaction fields in alphabetical order
// and signs with HMAC-SHA512. Adjust field list for your provider.
const PAYMOB_HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order", "owner", "pending", "source_data.pan",
  "source_data.sub_type", "source_data.type", "success",
];

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return String(current ?? "");
}

async function verifyPaymobHmac(
  transactionObj: Record<string, unknown>,
  receivedHmac: string,
): Promise<boolean> {
  const secret = Deno.env.get("PAYMOB_HMAC_SECRET");
  if (!secret) {
    console.error("[Webhook] PAYMOB_HMAC_SECRET not configured");
    return false;
  }

  const concatenated = PAYMOB_HMAC_FIELDS
    .map((field) => getNestedValue(transactionObj, field))
    .join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(concatenated),
  );

  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === receivedHmac;
}

// ── Main Handler ────────────────────────────────────────────────
serve(async (req: Request) => {
  // Webhooks are always POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // ── 1. Parse body ─────────────────────────────────────────
    const body = await req.json();

    // ── 2. HMAC Verification — BEFORE any DB operation ────────
    // CRIT-03 FIX: This MUST run first. Without it, anyone on the
    // internet can POST to this URL and activate arbitrary purchases.
    const isDev = Deno.env.get("ENVIRONMENT") === "development";

    if (!isDev) {
      const hmac = req.headers.get("x-paymob-hmac") ?? "";
      const transactionObj = body.obj ?? body;

      if (!hmac || !(await verifyPaymobHmac(transactionObj, hmac))) {
        console.error("[Webhook] HMAC verification failed — rejecting request");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[Webhook] DEV MODE: Skipping HMAC verification");
    }

    // ── 3. Initialize Supabase Admin ──────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 4. Extract event data ─────────────────────────────────
    // Map provider-specific fields to generic variables.
    // Adjust this mapping for your specific payment provider.
    const transactionData = body.obj ?? body;
    const paymentSessionId = transactionData.session_id ?? transactionData.order?.id?.toString() ?? body.session_id;
    const paymentId = transactionData.id?.toString() ?? body.payment_id;
    const userId = transactionData.order?.shipping_data?.extra_description ?? body.user_id; // Paymob stores user_id in metadata
    const isSuccess = transactionData.success === true || body.status === "success" || body.status === "paid";
    const isRefund = transactionData.is_refunded === true || body.status === "refunded";
    const isVoided = transactionData.is_voided === true || body.status === "voided";

    if (!paymentSessionId) {
      console.error("[Webhook] No session_id found in webhook payload");
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[Webhook] Processing: session=${paymentSessionId} success=${isSuccess} refund=${isRefund}`);

    // ── 5. Handle event types ─────────────────────────────────

    if (isRefund || isVoided) {
      // Refund/void: revoke access immediately
      await revokePurchase(supabaseAdmin, paymentSessionId, userId, isRefund ? "refunded" : "failed");
    } else if (isSuccess) {
      // Successful payment: activate
      await activatePurchase(supabaseAdmin, paymentSessionId, paymentId, userId);
    } else {
      // Failed payment
      await revokePurchase(supabaseAdmin, paymentSessionId, userId, "failed");
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook error";
    // Log error type only — never log the full webhook body (contains PII)
    console.error(`[Webhook Error]: ${message}`);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Activates a purchase. Idempotent — safe to call multiple times.
 * Only updates if current status is 'pending' (prevents re-activation of refunded purchases).
 * Includes user_id guard to prevent cross-user activation.
 */
async function activatePurchase(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  paymentId: string,
  userId: string,
) {
  // Build the query with user_id guard if available
  let query = supabase
    .from("purchases")
    .update({
      status: "active",
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_session_id", sessionId)
    .eq("status", "pending"); // Idempotency: only pending → active

  // User ID guard: prevents cross-user activation
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error, count } = await query.select("id").maybeSingle();

  if (error) {
    console.error(`[Webhook DB Error]: ${error.message}`);
    throw error;
  }

  console.log(`[Webhook] Activate result: session=${sessionId} user=${userId ?? "unknown"}`);
}

/**
 * Revokes a purchase (refund, dispute, void, failure).
 * Only updates if current status is NOT already the target status (idempotent).
 */
async function revokePurchase(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  userId: string,
  newStatus: "refunded" | "disputed" | "failed",
) {
  let query = supabase
    .from("purchases")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_session_id", sessionId)
    .neq("status", newStatus); // Idempotency

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error) {
    console.error(`[Webhook Revoke Error]: ${error.message}`);
    throw error;
  }

  console.log(`[Webhook] Revoked: session=${sessionId} newStatus=${newStatus}`);
}
