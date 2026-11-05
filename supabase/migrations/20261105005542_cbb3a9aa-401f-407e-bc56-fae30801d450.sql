ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS reception_finance text NOT NULL DEFAULT 'day';

CREATE OR REPLACE FUNCTION public.validate_reception_finance() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reception_finance NOT IN ('none','day','full') THEN RAISE EXCEPTION 'Acesso financeiro inválido'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_reception_finance ON public.barbershops;
CREATE TRIGGER trg_validate_reception_finance BEFORE INSERT OR UPDATE ON public.barbershops FOR EACH ROW EXECUTE FUNCTION public.validate_reception_finance();

CREATE OR REPLACE FUNCTION public.is_receptionist_of_barbershop(_user_id uuid, _barbershop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND barbershop_id = _barbershop_id AND role = 'receptionist')
$$;

CREATE OR REPLACE FUNCTION public.can_barber_edit_schedule(_user_id uuid, _target_barber_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_barber_id UUID; v_user_role app_role; v_shop uuid; v_can_edit_own BOOLEAN; v_can_edit_others BOOLEAN;
BEGIN
  SELECT role, barbershop_id INTO v_user_role, v_shop FROM public.user_roles WHERE user_id = _user_id;
  IF v_user_role = 'master' THEN RETURN TRUE; END IF;
  IF v_user_role = 'receptionist' THEN
    RETURN EXISTS (SELECT 1 FROM public.barbers WHERE id = _target_barber_id AND barbershop_id = v_shop);
  END IF;
  SELECT id INTO v_user_barber_id FROM public.barbers WHERE auth_id = _user_id;
  IF v_user_barber_id = _target_barber_id THEN
    SELECT bp.can_edit_own_schedule INTO v_can_edit_own FROM public.barber_permissions bp WHERE bp.barber_id = v_user_barber_id;
    RETURN COALESCE(v_can_edit_own, TRUE);
  ELSE
    SELECT bp.can_edit_others_schedule INTO v_can_edit_others FROM public.barber_permissions bp WHERE bp.barber_id = v_user_barber_id;
    RETURN COALESCE(v_can_edit_others, FALSE);
  END IF;
END;
$function$;

CREATE POLICY "Reception manages blocked slots" ON public.blocked_slots FOR ALL TO authenticated
  USING (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Reception manages products" ON public.products FOR ALL TO authenticated
  USING (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Reception manages plans" ON public.client_plans FOR ALL TO authenticated
  USING (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Reception manages subs" ON public.client_subscriptions FOR ALL TO authenticated
  USING (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can delete receptionist roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id) AND role = 'receptionist');