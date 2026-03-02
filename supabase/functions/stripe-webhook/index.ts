import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe price IDs to plan types
const PRICE_TO_PLAN: Record<string, { plan: string; maxBarbers: number }> = {
  "price_1T6EC0GpauAVelbBBlbRVHDJ": { plan: "basic", maxBarbers: 1 },
  "price_1T6ECGGpauAVelbB4j3CBjF4": { plan: "plus", maxBarbers: 3 },
  "price_1T6ECbGpauAVelbBIeVEcy8U": { plan: "pro", maxBarbers: 6 },
  "price_1T6EDEGpauAVelbBaL4qfEct": { plan: "studio", maxBarbers: 12 },
  "price_1T6EDTGpauAVelbB4hxyw7y9": { plan: "rede", maxBarbers: 20 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR", { message: "Missing stripe-signature header" });
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { message: msg });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        logStep("checkout.session.completed", { customerEmail });

        if (!customerEmail) {
          logStep("No customer email found in session");
          break;
        }

        // Get subscription to determine the plan
        let plan = "basic";
        let maxBarbers = 1;

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price?.id;
          logStep("Subscription price", { priceId });

          if (priceId && PRICE_TO_PLAN[priceId]) {
            plan = PRICE_TO_PLAN[priceId].plan;
            maxBarbers = PRICE_TO_PLAN[priceId].maxBarbers;
          }
        }

        // Find barbershop by email via barbers table (avoids listUsers pagination issue)
        const { data: barberData, error: barberError } = await supabaseAdmin
          .from("barbers")
          .select("barbershop_id")
          .eq("email", customerEmail)
          .limit(1)
          .single();

        if (barberError || !barberData?.barbershop_id) {
          logStep("No barbershop found for email", { customerEmail, error: barberError?.message });
          break;
        }

        const barbershopId = barberData.barbershop_id;

        // Activate subscription
        const { error: updateError } = await supabaseAdmin
          .from("barbershops")
          .update({
            subscription_active: true,
            subscription_status: "active",
            plan,
            max_barbers: maxBarbers,
          })
          .eq("id", barbershopId);

        if (updateError) {
          logStep("Error updating barbershop", { error: updateError.message });
        } else {
          logStep("Subscription activated", { barbershopId, plan });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("customer.subscription.deleted", { customerId });

        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          logStep("Customer was deleted");
          break;
        }

        const email = (customer as Stripe.Customer).email;
        if (!email) {
          logStep("No email on customer");
          break;
        }

        const { data: barberData2 } = await supabaseAdmin
          .from("barbers")
          .select("barbershop_id")
          .eq("email", email)
          .limit(1)
          .single();

        if (barberData2?.barbershop_id) {
          const { error: updateErr } = await supabaseAdmin
            .from("barbershops")
            .update({
              subscription_active: false,
              subscription_status: "expired",
              plan: "basic",
              max_barbers: 1,
            })
            .eq("id", barberData2.barbershop_id);

          if (updateErr) {
            logStep("Error deactivating", { error: updateErr.message });
          } else {
            logStep("Subscription deactivated", { barbershopId: barberData2.barbershop_id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        logStep("invoice.payment_failed", { customerId });

        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;

        const email = (customer as Stripe.Customer).email;
        if (!email) break;

        const { data: barberData3 } = await supabaseAdmin
          .from("barbers")
          .select("barbershop_id")
          .eq("email", email)
          .limit(1)
          .single();

        if (barberData3?.barbershop_id) {
          await supabaseAdmin
            .from("barbershops")
            .update({ subscription_active: false, subscription_status: "expired" })
            .eq("id", barberData3.barbershop_id);

          logStep("Marked payment as failed/pending", { barbershopId: barberData3.barbershop_id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
