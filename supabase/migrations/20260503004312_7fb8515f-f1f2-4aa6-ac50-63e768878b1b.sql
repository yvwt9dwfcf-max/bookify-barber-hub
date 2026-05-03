REVOKE EXECUTE ON FUNCTION public.materialize_recurring_expenses(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_recurring_expenses(uuid) TO authenticated;