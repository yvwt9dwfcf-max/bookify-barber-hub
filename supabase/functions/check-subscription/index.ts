import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan IDs
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U4Mvxs9AL0HFqE": "basic",
  "prod_U4MwyVH94ZhGxE": "plus",
  "prod_U4MwyRcbcn1FgD": "pro",
  "prod_U4MxBY9zovvmOT": "studio",
  "prod_U4Mxoa1DybH2Rm": "rede",
};

const PLAN_MAX_BARBERS: Record<string, number> = {
  basic: 1,
  plus: 3,
  pro: 6,
  studio: 12,
  rede: 20,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planId: string | null = null;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product as string;
      planId = PRODUCT_TO_PLAN[productId] || null;
      logStep("Active subscription found", { planId, productId, subscriptionEnd });

      // Sync plan to barbershop
      if (planId) {
        const { data: userRole } = await supabaseClient
          .from("user_roles")
          .select("barbershop_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (userRole?.barbershop_id) {
          const maxBarbers = PLAN_MAX_BARBERS[planId] || 1;
          await supabaseClient
            .from("barbershops")
            .update({
              plan: planId,
              max_barbers: maxBarbers,
              subscription_active: true,
            })
            .eq("id", userRole.barbershop_id);
          logStep("Synced plan to barbershop", { barbershopId: userRole.barbershop_id, planId, maxBarbers });
        }
      }
    } else {
      logStep("No active subscription found");
      // Mark subscription as inactive if trial expired
      const { data: userRole } = await supabaseClient
        .from("user_roles")
        .select("barbershop_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (userRole?.barbershop_id) {
        const { data: shop } = await supabaseClient
          .from("barbershops")
          .select("trial_ends_at")
          .eq("id", userRole.barbershop_id)
          .single();

        if (shop?.trial_ends_at && new Date(shop.trial_ends_at) < new Date()) {
          await supabaseClient
            .from("barbershops")
            .update({ subscription_active: false })
            .eq("id", userRole.barbershop_id);
          logStep("Marked subscription inactive (trial expired)");
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_id: planId,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
