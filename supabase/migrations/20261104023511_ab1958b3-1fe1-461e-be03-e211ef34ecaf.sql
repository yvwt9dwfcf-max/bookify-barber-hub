CREATE OR REPLACE FUNCTION public.consume_client_subscription(_sub_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT cs.*, cp.uses_limit INTO s FROM client_subscriptions cs JOIN client_plans cp ON cp.id = cs.plan_id
  WHERE cs.id = _sub_id FOR UPDATE OF cs;
  IF NOT FOUND OR s.barbershop_id <> get_user_barbershop_id(auth.uid()) THEN RAISE EXCEPTION 'Assinatura inválida'; END IF;
  IF s.expires_at < CURRENT_DATE THEN RAISE EXCEPTION 'Assinatura vencida'; END IF;
  IF s.uses_limit IS NOT NULL AND s.uses_count >= s.uses_limit THEN RAISE EXCEPTION 'Assinatura sem usos disponíveis'; END IF;
  UPDATE client_subscriptions SET uses_count = uses_count + 1 WHERE id = _sub_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_client_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_client_subscription(uuid) TO authenticated;