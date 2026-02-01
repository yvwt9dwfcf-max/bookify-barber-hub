import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AddBarberRequest {
  name: string;
  email: string;
  password: string;
  barbershop_id: string;
  permissions?: {
    can_edit_own_schedule: boolean;
    can_view_others_schedule: boolean;
    can_edit_others_schedule: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the calling user's auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user is a master of the barbershop
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: AddBarberRequest = await req.json();
    const { name, email, password, barbershop_id, permissions } = body;

    // Validate required fields
    if (!name || !email || !barbershop_id) {
      return new Response(
        JSON.stringify({ error: "Nome, email e barbearia são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify calling user is master of this barbershop
    const { data: isMaster } = await supabaseAdmin.rpc("is_master_of_barbershop", {
      _user_id: callingUser.id,
      _barbershop_id: barbershop_id,
    });

    if (!isMaster) {
      return new Response(
        JSON.stringify({ error: "Apenas o administrador pode adicionar barbeiros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if can add more barbers
    const { data: canAdd } = await supabaseAdmin.rpc("can_add_barber", {
      _barbershop_id: barbershop_id,
    });

    if (!canAdd) {
      return new Response(
        JSON.stringify({ error: "Limite de barbeiros atingido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // User exists - check if already in this barbershop
      const { data: existingBarber } = await supabaseAdmin
        .from("barbers")
        .select("id, barbershop_id, is_active")
        .eq("auth_id", existingUser.id)
        .maybeSingle();

      if (existingBarber) {
        if (existingBarber.barbershop_id === barbershop_id && existingBarber.is_active) {
          return new Response(
            JSON.stringify({ error: "Este barbeiro já faz parte da sua equipe" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (existingBarber.barbershop_id && existingBarber.barbershop_id !== barbershop_id && existingBarber.is_active) {
          return new Response(
            JSON.stringify({ error: "Este barbeiro já pertence a outra barbearia" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Reactivate inactive barber in same barbershop
        if (existingBarber.barbershop_id === barbershop_id && !existingBarber.is_active) {
          const { error: updateError } = await supabaseAdmin
            .from("barbers")
            .update({ is_active: true, name })
            .eq("id", existingBarber.id);

          if (updateError) throw updateError;

          // Update permissions if provided
          if (permissions) {
            await supabaseAdmin.from("barber_permissions").upsert({
              barber_id: existingBarber.id,
              ...permissions,
            }, { onConflict: "barber_id" });
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Barbeiro reativado com sucesso",
              barber_id: existingBarber.id,
              is_new_user: false 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Barber exists but without barbershop - update to link
        if (!existingBarber.barbershop_id) {
          const { error: updateError } = await supabaseAdmin
            .from("barbers")
            .update({ 
              barbershop_id, 
              is_active: true, 
              name 
            })
            .eq("id", existingBarber.id);

          if (updateError) throw updateError;

          // Create/update user role
          await supabaseAdmin.from("user_roles").upsert({
            user_id: existingUser.id,
            role: "barber",
            barbershop_id,
          }, { onConflict: "user_id" });

          // Update permissions
          if (permissions) {
            await supabaseAdmin.from("barber_permissions").upsert({
              barber_id: existingBarber.id,
              ...permissions,
            }, { onConflict: "barber_id" });
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Barbeiro vinculado com sucesso",
              barber_id: existingBarber.id,
              is_new_user: false 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // User exists but no barber record - create barber profile
      userId = existingUser.id;
      isNewUser = false;
    } else {
      // Create new user
      if (!password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Senha é obrigatória para novos usuários (mínimo 6 caracteres)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          is_barber_invite: true,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar usuário: " + createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
    }

    // Create barber profile
    const { data: barberData, error: barberError } = await supabaseAdmin
      .from("barbers")
      .insert({
        auth_id: userId,
        name,
        email,
        barbershop_id,
        is_active: true,
      })
      .select()
      .single();

    if (barberError) {
      console.error("Error creating barber:", barberError);
      // If we created a new user, try to clean up
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ error: "Erro ao criar perfil do barbeiro" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "barber",
      barbershop_id,
    });

    if (roleError) {
      console.error("Error creating role:", roleError);
      // Clean up barber
      await supabaseAdmin.from("barbers").delete().eq("id", barberData.id);
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ error: "Erro ao criar papel do usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create permissions
    const defaultPermissions = permissions || {
      can_edit_own_schedule: true,
      can_view_others_schedule: false,
      can_edit_others_schedule: false,
    };

    const { error: permError } = await supabaseAdmin.from("barber_permissions").insert({
      barber_id: barberData.id,
      ...defaultPermissions,
    });

    if (permError) {
      console.error("Error creating permissions:", permError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewUser ? "Barbeiro criado com sucesso" : "Barbeiro vinculado com sucesso",
        barber_id: barberData.id,
        is_new_user: isNewUser,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
