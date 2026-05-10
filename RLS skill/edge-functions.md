# Reference: Edge Functions (Deno / TypeScript)

Deploy with: `supabase functions deploy <function-name>`

All functions use the Supabase service role key stored as a secret:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set APP_URL=https://your-app.com   # for CORS
```

---

## Function 1 — `create-checkout`

Called by the client to initiate a Stripe Checkout Session.

```typescript
// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the user ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon client to verify the user's JWT
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Validate request body ──────────────────────────────────────
    const body = await req.json();
    const { module_id, success_url, cancel_url } = body;

    if (!module_id || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Fetch module price from DB using service role ──────────────
    // Service role bypasses RLS — intentional for internal price lookup
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: priceData, error: priceError } = await supabaseAdmin
      .from("module_prices")
      .select("stripe_price_id, amount_cents, currency")
      .eq("module_id", module_id)
      .eq("is_active", true)
      .single();

    if (priceError || !priceData) {
      return new Response(JSON.stringify({ error: "Module not available for purchase" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Check if user already has active access ────────────────────
    const { data: existingPurchase } = await supabaseAdmin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("module_id", module_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingPurchase) {
      return new Response(JSON.stringify({ error: "Already purchased" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Create Stripe Checkout Session ─────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceData.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      customer_email: user.email,
      metadata: {
        user_id: user.id,       // Used by webhook to match purchase
        module_id: module_id,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          module_id: module_id,
        },
      },
    });

    // ── 6. Insert pending purchase record ─────────────────────────────
    // Status is 'pending' until webhook confirms payment
    await supabaseAdmin.from("purchases").insert({
      user_id: user.id,
      module_id: module_id,
      stripe_session_id: session.id,
      amount_cents: priceData.amount_cents,
      currency: priceData.currency,
      status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## Function 2 — `stripe-webhook`

Receives events from Stripe. This is the only function that activates a purchase.

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  // ── 1. Verify Stripe signature ────────────────────────────────────
  // CRITICAL: Never skip this. An attacker can POST fake events
  // to grant themselves free access without paying.
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("Webhook: missing stripe-signature header");
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.text();   // Must be raw text for signature verification
  
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    // Log only the error type, NEVER log body or signature (security)
    console.error("Webhook signature verification failed:", err instanceof Error ? err.message : "unknown");
    return new Response("Invalid signature", { status: 400 });
  }

  // ── 2. Service role client for DB writes ──────────────────────────
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 3. Handle events ──────────────────────────────────────────────
  try {
    switch (event.type) {
      
      // Primary payment success path
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.payment_status !== "paid") {
          // Session completed but not yet paid (e.g. bank transfer)
          // Will be activated by payment_intent.succeeded
          break;
        }

        await activatePurchase(supabaseAdmin, {
          sessionId: session.id,
          paymentIntentId: session.payment_intent as string,
          userId: session.metadata?.user_id,
          moduleId: session.metadata?.module_id,
        });
        break;
      }

      // Handles delayed payment methods (SEPA, BACS, etc.)
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const userId = pi.metadata?.user_id;
        const moduleId = pi.metadata?.module_id;

        if (!userId || !moduleId) break;   // Not a Harvi payment intent

        // Find the session linked to this payment intent
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        });
        
        if (sessions.data.length > 0) {
          await activatePurchase(supabaseAdmin, {
            sessionId: sessions.data[0].id,
            paymentIntentId: pi.id,
            userId,
            moduleId,
          });
        }
        break;
      }

      // Handle refunds — immediately revoke access
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = charge.payment_intent as string;

        if (pi) {
          const { error } = await supabaseAdmin
            .from("purchases")
            .update({ status: "refunded", updated_at: new Date().toISOString() })
            .eq("stripe_payment_intent", pi);

          if (error) {
            console.error("Failed to mark refund:", error);
            return new Response("DB error", { status: 500 });
          }
        }
        break;
      }

      // Handle disputes — freeze access until resolved
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const pi = dispute.payment_intent as string;

        if (pi) {
          await supabaseAdmin
            .from("purchases")
            .update({ status: "disputed", updated_at: new Date().toISOString() })
            .eq("stripe_payment_intent", pi);
        }
        break;
      }

      // Dispute won — restore access
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        if (dispute.status === "won") {
          const pi = dispute.payment_intent as string;
          if (pi) {
            await supabaseAdmin
              .from("purchases")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("stripe_payment_intent", pi);
          }
        }
        break;
      }

      default:
        // Unknown event type — acknowledge receipt, take no action
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook handler error:", error);
    // Return 500 so Stripe retries the webhook
    return new Response("Handler error", { status: 500 });
  }
});

// ── Helper: activate a purchase idempotently ──────────────────────────────
async function activatePurchase(
  supabase: ReturnType<typeof createClient>,
  params: {
    sessionId: string;
    paymentIntentId: string | null;
    userId: string | undefined;
    moduleId: string | undefined;
  }
) {
  if (!params.userId || !params.moduleId) {
    console.error("activatePurchase: missing userId or moduleId in metadata");
    return;
  }

  // Idempotent upsert — safe to call multiple times for the same session
  const { error } = await supabase
    .from("purchases")
    .update({
      status: "active",
      stripe_payment_intent: params.paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", params.sessionId)
    .eq("user_id", params.userId);   // Extra guard: never update another user's purchase

  if (error) {
    console.error("Failed to activate purchase:", error);
    throw error;   // Re-throw so caller returns 500 and Stripe retries
  }

  console.log(`Purchase activated: user=${params.userId} module=${params.moduleId}`);
}
```

---

## Function 3 — `verify-purchase`

Called by the client after returning from Stripe Checkout. Checks if payment was confirmed. Idempotent.

```typescript
// supabase/functions/verify-purchase/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate ───────────────────────────────────────────────
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Validate body ──────────────────────────────────────────────
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Look up purchase in DB first (fast path) ───────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("id, module_id, status")
      .eq("stripe_session_id", session_id)
      .eq("user_id", user.id)   // CRITICAL: must be the authenticated user's session
      .maybeSingle();

    // If already active in DB, return success immediately
    if (purchase?.status === "active") {
      return new Response(JSON.stringify({
        status: "active",
        module_id: purchase.module_id,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Check Stripe as fallback (webhook may not have fired yet) ──
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // CRITICAL: Verify the session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Session mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.payment_status === "paid") {
      // Webhook hasn't fired yet — activate now
      await supabaseAdmin
        .from("purchases")
        .update({
          status: "active",
          stripe_payment_intent: session.payment_intent as string,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session_id)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({
        status: "active",
        module_id: session.metadata?.module_id,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment not completed
    return new Response(JSON.stringify({ status: purchase?.status ?? "pending" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("verify-purchase error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## Deployment Commands

```bash
# Deploy all functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy verify-purchase

# Set secrets (run once)
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  APP_URL=https://your-app-domain.com

# Register webhook in Stripe (CLI)
stripe listen --forward-to https://<project-ref>.supabase.co/functions/v1/stripe-webhook

# Events to register in Stripe Dashboard:
# - checkout.session.completed
# - payment_intent.succeeded
# - charge.refunded
# - charge.dispute.created
# - charge.dispute.closed
```
