import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    console.log(`[DELETE-ACCOUNT] Starting deletion for user ${user.id}`);

    // 1. Cancel active Stripe subscription if exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && user.email) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          const subs = await stripe.subscriptions.list({ customer: customerId, status: "active" });
          for (const sub of subs.data) {
            await stripe.subscriptions.cancel(sub.id);
            console.log(`[DELETE-ACCOUNT] Cancelled Stripe subscription ${sub.id}`);
          }
        }
      } catch (stripeErr) {
        console.error(`[DELETE-ACCOUNT] Stripe error (non-blocking):`, stripeErr);
      }
    }

    // 2. Get barbershop_id via user_roles
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("barbershop_id, role")
      .eq("user_id", user.id)
      .single();

    if (roleData) {
      const { barbershop_id, role } = roleData;

      // Get barber record
      const { data: barberData } = await supabaseAdmin
        .from("barbers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (barberData) {
        // Delete barber-related data
        await supabaseAdmin.from("barber_permissions").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("barber_whatsapp").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("barber_services").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("barber_commissions").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("opening_hours").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("blocked_slots").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("appointments").delete().eq("barber_id", barberData.id);
        await supabaseAdmin.from("barbers").delete().eq("id", barberData.id);
      }

      // If master, delete the whole barbershop
      if (role === "master") {
        await supabaseAdmin.from("loyalty_transactions").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("loyalty_cards").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("loyalty_config").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("loyalty_rewards").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("commission_overrides").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("whatsapp_settings").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("public_profiles").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("barbershop_gallery").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("services").delete().eq("barbershop_id", barbershop_id);
        await supabaseAdmin.from("barbershops").delete().eq("id", barbershop_id);
      }

      // Delete user role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    }

    // 3. Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    console.log(`[DELETE-ACCOUNT] Successfully deleted user ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[DELETE-ACCOUNT] Error:`, msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
