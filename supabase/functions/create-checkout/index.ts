// supabase/functions/create-checkout/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { module_id, subject_id, success_url, cancel_url } = await req.json();
    if ((!module_id && !subject_id) || !success_url || !cancel_url) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Determine target table and ID
    const targetTable = subject_id ? "subjects" : "modules";
    const targetId = subject_id || module_id;

    // 2. Fetch Price & Metadata directly from content table
    const { data: item, error: itemError } = await supabaseAdmin
      .from(targetTable)
      .select("price_cents, external_price_id, is_free, name")
      .eq("id", targetId)
      .single();

    if (itemError || !item || item.is_free) {
      throw new Error("Item is not available for purchase");
    }

    // 3. Create Session (Manual/Mock for now)
    const paymentSessionId = `manual_${crypto.randomUUID()}`;

    // 4. Record the Purchase
    // This now supports either module_id OR subject_id
    await supabaseAdmin.from("purchases").insert({
      user_id: user.id,
      module_id: module_id || null,
      subject_id: subject_id || null,
      payment_session_id: paymentSessionId,
      amount_cents: item.price_cents,
      currency: "usd",
      status: "active", // Auto-activate for manual mode
      provider: "manual",
    });

    const checkoutUrl = `${success_url}?session_id=${paymentSessionId}`;

    return new Response(JSON.stringify({ url: checkoutUrl, session_id: paymentSessionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[CreateCheckout Error]:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
