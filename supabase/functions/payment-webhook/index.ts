// supabase/functions/payment-webhook/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

/**
 * Generic Payment Webhook
 * 
 * This is designed to be provider-agnostic.
 * You can point Paymob or any other provider here.
 */
serve(async (req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Verify Request (Paymob uses a specific HMAC signature)
    // For now, we'll assume the request is valid or handled manually.
    const body = await req.json();
    
    // Example Paymob logic:
    // const hmac = req.headers.get("x-paymob-hmac");
    // if (!verifyPaymobHmac(body, hmac)) throw new Error("Invalid signature");

    console.log(`[Webhook] Processing event for provider: ${body.provider || 'unknown'}`);

    // 2. Extract Generic Data
    // You will map your provider's fields (e.g. body.obj.order.id) to these generic variables.
    const paymentSessionId = body.session_id; // Mapping required here for Paymob
    const paymentId = body.payment_id;
    const userId = body.user_id;
    const moduleId = body.module_id;
    const status = body.status; // e.g., 'success' or 'paid'

    if (status === "success" || status === "paid") {
      await activatePurchase(supabaseAdmin, {
        sessionId: paymentSessionId,
        paymentId: paymentId,
        userId: userId,
        moduleId: moduleId,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Webhook error";
    console.error(`[Webhook Error]: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Helper: Updates purchase status to 'active' idempotently.
 */
async function activatePurchase(
  supabase: any,
  params: {
    sessionId: string;
    paymentId: string;
    userId: string;
    moduleId: string;
  },
) {
  const { error } = await supabase
    .from("purchases")
    .update({
      status: "active",
      payment_id: params.paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_session_id", params.sessionId)
    .eq("user_id", params.userId);

  if (error) {
    console.error(`[Webhook DB Error]: ${error.message}`);
    throw error;
  }

  console.log(`[Webhook Success] Activated access: user=${params.userId} module=${params.moduleId}`);
}
