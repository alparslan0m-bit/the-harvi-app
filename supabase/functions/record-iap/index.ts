// supabase/functions/record-iap/index.ts
// Records a successful in-app purchase (Apple/Google) in the purchases table.
// Called from the mobile app after RevenueCat confirms a purchase.
// RevenueCat handles all receipt validation — this function just records
// the entitlement in our DB so get_content_access_map() picks it up.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

// Ambient declaration for editor TypeScript language servers
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // ── 1. Authenticate ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseAnon.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Validate Input ───────────────────────────────────────
    const { module_id, transaction_id, store } = await req.json();

    if (!module_id || !transaction_id || !store) {
      return new Response(
        JSON.stringify({ error: "module_id, transaction_id and store are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!["apple_iap", "google_play"].includes(store)) {
      return new Response(
        JSON.stringify({ error: "store must be apple_iap or google_play" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 3. Validate module exists ───────────────────────────────
    const { data: item, error: itemError } = await supabaseAdmin
      .from("modules")
      .select("id, name, price_cents")
      .eq("id", module_id)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Module not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Idempotency & Replay Protection ─────────
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id, status, user_id")
      .eq("store_transaction_id", transaction_id)
      .maybeSingle();

    if (existing) {
      if (existing.user_id !== user.id) {
        // Receipt replay vulnerability blocked
        return new Response(
          JSON.stringify({ error: "Transaction has already been redeemed by another user." }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Already recorded by this user — return success (idempotent)
      return new Response(
        JSON.stringify({
          status: existing.status,
          module_id,
          already_recorded: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 5. Server-side RevenueCat Validation ─────────────────────
    const rcApiKey = Deno.env.get("REVENUECAT_API_KEY");
    if (rcApiKey) {
      try {
        const rcRes = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
          {
            headers: {
              Authorization: `Bearer ${rcApiKey}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!rcRes.ok) {
          console.error(
            `[RecordIAP] RevenueCat verification failed with status: ${rcRes.status}`,
          );
          return new Response(
            JSON.stringify({ error: "Failed to verify transaction with store provider" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const rcData = await rcRes.json();
        const nonSubscriptions = rcData?.subscriber?.non_subscriptions || {};
        const entitlements = rcData?.subscriber?.entitlements || {};

        const hasMatchingTx = Object.values(nonSubscriptions).some(
          (items: any) =>
            Array.isArray(items) &&
            items.some(
              (item: any) =>
                item.store_transaction_id === transaction_id ||
                item.id === transaction_id,
            ),
        );

        const hasMatchingEntitlement = Object.values(entitlements).some(
          (ent: any) => ent?.product_identifier === transaction_id,
        );

        if (!hasMatchingTx && !hasMatchingEntitlement) {
          console.warn(
            `[RecordIAP] Fraud guard: Transaction ${transaction_id} not found for user ${user.id}`,
          );
          return new Response(
            JSON.stringify({ error: "Transaction not found or unverified" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (rcErr: unknown) {
        const msg = rcErr instanceof Error ? rcErr.message : "RC validation error";
        console.error("[RecordIAP] RevenueCat validation request failed:", msg);
        return new Response(
          JSON.stringify({ error: "Unable to verify transaction" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      console.warn(
        "[RecordIAP] REVENUECAT_API_KEY not configured. Running without server-side receipt validation.",
      );
    }

    // ── 6. Check for existing active purchase (prevent double-buy)
    const { data: activePurchase } = await supabaseAdmin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("module_id", module_id)
      .eq("status", "active")
      .maybeSingle();

    if (activePurchase) {
      return new Response(
        JSON.stringify({ error: "You already have access to this module" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 7. Record the purchase ──────────────────────────────────
    const { error: insertError } = await supabaseAdmin
      .from("purchases")
      .insert({
        user_id: user.id,
        module_id,
        status: "active",
        amount_cents: item.price_cents || 0,
        currency: "usd",
        provider: store,
        payment_id: transaction_id,
        store_transaction_id: transaction_id,
        store: store,
      });

    if (insertError) {
      console.error("[RecordIAP DB Error]:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Failed to record purchase" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[RecordIAP] Recorded: user=${user.id} store=${store} tx=${transaction_id}`,
    );

    return new Response(
      JSON.stringify({
        status: "active",
        module_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[RecordIAP Error]:", message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
