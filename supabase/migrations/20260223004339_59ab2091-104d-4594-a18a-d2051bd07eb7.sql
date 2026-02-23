
-- Fix: sync max_barbers with plan for ALL existing barbershops
UPDATE public.barbershops SET max_barbers = 1 WHERE plan = 'basic';
UPDATE public.barbershops SET max_barbers = 3 WHERE plan = 'plus';
UPDATE public.barbershops SET max_barbers = 6 WHERE plan = 'pro';
UPDATE public.barbershops SET max_barbers = 12 WHERE plan = 'studio';
UPDATE public.barbershops SET max_barbers = 20 WHERE plan = 'rede';

-- Fix the default to match basic plan
ALTER TABLE public.barbershops ALTER COLUMN max_barbers SET DEFAULT 1;

-- Fix the trigger function to use correct max_barbers based on plan
CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
  v_is_invite BOOLEAN;
BEGIN
  v_is_invite := COALESCE((NEW.raw_user_meta_data->>'is_barber_invite')::BOOLEAN, FALSE);
  
  IF v_is_invite THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO public.barbershops (name, plan, max_barbers)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'),
    'basic',
    1
  )
  RETURNING id INTO v_barbershop_id;
  
  INSERT INTO public.barbers (auth_id, name, email, barbershop_id, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Barbeiro'),
    NEW.email,
    v_barbershop_id,
    true
  )
  RETURNING id INTO v_barber_id;
  
  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (NEW.id, 'master', v_barbershop_id);
  
  INSERT INTO public.barber_permissions (barber_id, can_edit_own_schedule, can_view_others_schedule, can_edit_others_schedule)
  VALUES (v_barber_id, true, true, true);
  
  RETURN NEW;
END;
$function$;

-- Also create a trigger to auto-sync max_barbers when plan changes
CREATE OR REPLACE FUNCTION public.sync_max_barbers_on_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.max_barbers := public.get_plan_limit(NEW.plan::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_plan_max_barbers ON public.barbershops;
CREATE TRIGGER sync_plan_max_barbers
  BEFORE UPDATE ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_max_barbers_on_plan_change();
