
-- Restore EXECUTE on SECURITY DEFINER helpers that are referenced by RLS policies.
-- Revoking these broke authenticated queries: policy USING clauses could not evaluate,
-- so tables like barbershops/barbers/user_roles returned no rows and the painel showed
-- the "Não conseguimos abrir seu painel" recovery screen.
GRANT EXECUTE ON FUNCTION public.is_master_of_barbershop(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_barbershop_id(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_barber_owner(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_barber_view_schedule(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_barber_edit_schedule(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_barber_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_barber_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_add_barber(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_barbers_in_barbershop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_recurring_expenses(uuid) TO authenticated;
