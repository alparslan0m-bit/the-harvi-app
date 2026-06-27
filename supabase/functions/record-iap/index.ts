// supabase/functions/record-iap/index.ts
// Records a successful in-app purchase (Apple/Google) in the purchases table.
// Called from the mobile app after RevenueCat confirms a purchase.
// RevenueCat handles all receipt validation — this function just records
// the entitlement in our DB so get_content_access_map() picks it up.
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

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
    const { module_id, subject_id, transaction_id, store } = await req.json();

    if (!transaction_id || !store) {
      return new Response(
        JSON.stringify({ error: "transaction_id and store are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!module_id && !subject_id) {
      return new Response(
        JSON.stringify({ error: "module_id or subject_id required" }),
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

    // ── 3. Validate target exists ───────────────────────────────
    const targetTable = subject_id ? "subjects" : "modules";
    const targetId = subject_id || module_id;

    const { data: item, error: itemError } = await supabaseAdmin
      .from(targetTable)
      .select("id, name, price_cents")
      .eq("id", targetId)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Idempotency: check for duplicate transaction ─────────
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id, status")
      .eq("store_transaction_id", transaction_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Already recorded — return success (idempotent)
      return new Response(
        JSON.stringify({
          status: existing.status,
          module_id: module_id || null,
          subject_id: subject_id || null,
          already_recorded: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 5. Check for existing active purchase (prevent double-buy)
    const targetColumn = subject_id ? "subject_id" : "module_id";
    const { data: activePurchase } = await supabaseAdmin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq(targetColumn, targetId)
      .eq("status", "active")
      .maybeSingle();

    if (activePurchase) {
      return new Response(
        JSON.stringify({ error: "You already have access to this content" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 6. Record the purchase ──────────────────────────────────
    const { error: insertError } = await supabaseAdmin
      .from("purchases")
      .insert({
        user_id: user.id,
        module_id: module_id || null,
        subject_id: subject_id || null,
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
        module_id: module_id || null,
        subject_id: subject_id || null,
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
