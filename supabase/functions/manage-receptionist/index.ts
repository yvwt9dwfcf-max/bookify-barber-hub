import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const authed = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return json({ error: "Sessão expirada" }, 401);

    const body = await req.json();
    const { action, barbershop_id } = body ?? {};
    if (!barbershop_id) return json({ error: "Empresa não informada" }, 400);
    const { data: isMaster } = await admin.rpc("is_master_of_barbershop", { _user_id: user.id, _barbershop_id: barbershop_id });
    if (!isMaster) return json({ error: "Apenas o dono pode gerenciar a recepção" }, 403);

    if (action === "list") {
      const { data: roles } = await admin.from("user_roles").select("user_id, created_at")
        .eq("barbershop_id", barbershop_id).eq("role", "receptionist");
      const list = [];
      for (const r of roles ?? []) {
        const { data } = await admin.auth.admin.getUserById(r.user_id);
        list.push({ user_id: r.user_id, email: data.user?.email ?? "", name: data.user?.user_metadata?.name ?? "Recepção" });
      }
      return json({ receptionists: list });
    }

    if (action === "remove") {
      const { user_id } = body;
      const { data: role } = await admin.from("user_roles").select("id").eq("user_id", user_id)
        .eq("barbershop_id", barbershop_id).eq("role", "receptionist").maybeSingle();
      if (!role) return json({ error: "Recepcionista não encontrada" }, 404);
      await admin.from("user_roles").delete().eq("id", role.id);
      await admin.auth.admin.deleteUser(user_id);
      return json({ success: true });
    }

    if (action === "create") {
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!name || !email) return json({ error: "Informe nome e email" }, 400);
      if (password.length < 6) return json({ error: "A senha precisa de pelo menos 6 caracteres" }, 400);
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name, is_barber_invite: true, is_receptionist: true },
      });
      let userId = created?.user?.id;
      let reused = false;
      if (error || !userId) {
        if (!/already|registered|exists/i.test(error?.message ?? "")) return json({ error: "Não foi possível criar a conta" }, 400);
        // Email already exists: reuse it only if it's an orphan (no role and no linked business).
        let found: { id: string } | undefined;
        for (let page = 1; page <= 20 && !found; page++) {
          const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          found = data?.users.find((u) => u.email?.toLowerCase() === email);
          if (!data || data.users.length < 200) break;
        }
        if (!found) return json({ error: "Este email já tem uma conta" }, 400);
        const { data: roles } = await admin.from("user_roles").select("id").eq("user_id", found.id);
        const { data: linked } = await admin.from("barbers").select("id").eq("auth_id", found.id).not("barbershop_id", "is", null);
        if ((roles?.length ?? 0) > 0 || (linked?.length ?? 0) > 0) return json({ error: "Este email já está em uso em outra conta" }, 400);
        await admin.from("barbers").delete().eq("auth_id", found.id).is("barbershop_id", null);
        const { error: upErr } = await admin.auth.admin.updateUserById(found.id, {
          password, email_confirm: true,
          user_metadata: { name, is_barber_invite: true, is_receptionist: true },
        });
        if (upErr) return json({ error: "Não foi possível liberar o acesso" }, 400);
        userId = found.id;
        reused = true;
      }
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: "receptionist", barbershop_id });
      if (roleErr) {
        if (!reused) await admin.auth.admin.deleteUser(userId!);
        return json({ error: "Não foi possível liberar o acesso" }, 400);
      }
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
