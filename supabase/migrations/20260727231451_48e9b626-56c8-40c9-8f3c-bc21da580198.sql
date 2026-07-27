-- 1) blocked_slots: scope public read + hide reason from anon
DROP POLICY IF EXISTS "Anyone can view blocked slots" ON public.blocked_slots;

CREATE POLICY "Public can view upcoming blocked slots"
ON public.blocked_slots FOR SELECT TO anon
USING (end_time >= (now() - interval '1 day'));

CREATE POLICY "Staff can view blocked slots in their barbershop"
ON public.blocked_slots FOR SELECT TO authenticated
USING (
  public.is_barber_owner(barber_id)
  OR barbershop_id = public.get_user_barbershop_id(auth.uid())
);

REVOKE SELECT ON public.blocked_slots FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, start_time, end_time, created_at) ON public.blocked_slots TO anon;

-- 2) Restrict staff-only policies to authenticated role
ALTER POLICY "Users can view their own barbershop" ON public.barbershops TO authenticated;
ALTER POLICY "Masters can update their barbershop" ON public.barbershops TO authenticated;

ALTER POLICY "Users can view their own role" ON public.user_roles TO authenticated;
ALTER POLICY "Masters can view roles in their barbershop" ON public.user_roles TO authenticated;
ALTER POLICY "Masters can insert roles in their barbershop" ON public.user_roles TO authenticated;
ALTER POLICY "Masters can delete barber roles in their barbershop" ON public.user_roles TO authenticated;

ALTER POLICY "Masters can view permissions in their barbershop" ON public.barber_permissions TO authenticated;
ALTER POLICY "Barbers can view their own permissions" ON public.barber_permissions TO authenticated;
ALTER POLICY "Masters can insert permissions" ON public.barber_permissions TO authenticated;
ALTER POLICY "Masters can update permissions" ON public.barber_permissions TO authenticated;
ALTER POLICY "Masters can delete permissions" ON public.barber_permissions TO authenticated;

ALTER POLICY "Users can view barbers in their barbershop" ON public.barbers TO authenticated;
ALTER POLICY "Masters can insert barbers in their barbershop" ON public.barbers TO authenticated;
ALTER POLICY "Barbers can update their own profile" ON public.barbers TO authenticated;
ALTER POLICY "Masters can update barbers in their barbershop" ON public.barbers TO authenticated;
ALTER POLICY "Masters can delete barbers in their barbershop" ON public.barbers TO authenticated;

ALTER POLICY "Users can update appointments based on permissions" ON public.appointments TO authenticated;
ALTER POLICY "Users can delete appointments based on permissions" ON public.appointments TO authenticated;

ALTER POLICY "Users can view services in their barbershop" ON public.services TO authenticated;
ALTER POLICY "Barbers can insert services" ON public.services TO authenticated;
ALTER POLICY "Barbers can update their services" ON public.services TO authenticated;
ALTER POLICY "Barbers can delete their services" ON public.services TO authenticated;

ALTER POLICY "Barbers can insert their hours" ON public.opening_hours TO authenticated;
ALTER POLICY "Barbers can update their hours" ON public.opening_hours TO authenticated;
ALTER POLICY "Barbers can delete their hours" ON public.opening_hours TO authenticated;

ALTER POLICY "Barbers can insert blocked slots" ON public.blocked_slots TO authenticated;
ALTER POLICY "Barbers can update blocked slots" ON public.blocked_slots TO authenticated;
ALTER POLICY "Barbers can delete blocked slots" ON public.blocked_slots TO authenticated;

ALTER POLICY "Masters can manage barber_services" ON public.barber_services TO authenticated;
ALTER POLICY "Barbers can manage their own services" ON public.barber_services TO authenticated;

ALTER POLICY "Masters can manage gallery" ON public.barbershop_gallery TO authenticated;

ALTER POLICY "Masters can insert their public profile" ON public.public_profiles TO authenticated;
ALTER POLICY "Masters can update their public profile" ON public.public_profiles TO authenticated;
ALTER POLICY "Masters can delete their public profile" ON public.public_profiles TO authenticated;

ALTER POLICY "Masters can view their barbershop whatsapp settings" ON public.whatsapp_settings TO authenticated;
ALTER POLICY "Masters can insert their barbershop whatsapp settings" ON public.whatsapp_settings TO authenticated;
ALTER POLICY "Masters can update their barbershop whatsapp settings" ON public.whatsapp_settings TO authenticated;

ALTER POLICY "Barbers can insert their own whatsapp settings" ON public.barber_whatsapp TO authenticated;
ALTER POLICY "Barbers can update their own whatsapp settings" ON public.barber_whatsapp TO authenticated;

ALTER POLICY "Barbershop members can view commissions" ON public.barber_commissions TO authenticated;
ALTER POLICY "Masters can manage commissions" ON public.barber_commissions TO authenticated;
ALTER POLICY "Masters can update commissions" ON public.barber_commissions TO authenticated;
ALTER POLICY "Masters can delete commissions" ON public.barber_commissions TO authenticated;

ALTER POLICY "Barbershop members can view overrides" ON public.commission_overrides TO authenticated;
ALTER POLICY "Masters can manage overrides" ON public.commission_overrides TO authenticated;
ALTER POLICY "Masters can update overrides" ON public.commission_overrides TO authenticated;
ALTER POLICY "Masters can delete overrides" ON public.commission_overrides TO authenticated;

ALTER POLICY "Barbershop members can manage cards" ON public.loyalty_cards TO authenticated;
ALTER POLICY "Masters can manage loyalty config" ON public.loyalty_config TO authenticated;
ALTER POLICY "Masters can update loyalty config" ON public.loyalty_config TO authenticated;
ALTER POLICY "Barbershop members can view rewards" ON public.loyalty_rewards TO authenticated;
ALTER POLICY "Masters can manage rewards" ON public.loyalty_rewards TO authenticated;
ALTER POLICY "Masters can update rewards" ON public.loyalty_rewards TO authenticated;
ALTER POLICY "Masters can delete rewards" ON public.loyalty_rewards TO authenticated;
ALTER POLICY "Barbers can create transactions" ON public.loyalty_transactions TO authenticated;
ALTER POLICY "Barbershop members can create transactions" ON public.loyalty_transactions TO authenticated;
ALTER POLICY "Barbershop members can view transactions" ON public.loyalty_transactions TO authenticated;

-- 3) Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.get_user_barbershop_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_barber_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_master_of_barbershop(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_add_barber(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_barber_edit_schedule(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_barber_view_schedule(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_barbershop_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_barber_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_master_of_barbershop(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_add_barber(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_barber_edit_schedule(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_barber_view_schedule(uuid, uuid) TO authenticated, service_role;

-- Admin-only helpers: not callable directly from the client API
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_current_barber_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_barber_permissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_barbers_in_barbershop(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.materialize_recurring_expenses(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_current_barber_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_barber_permissions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_barbers_in_barbershop(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.materialize_recurring_expenses(uuid) TO service_role;