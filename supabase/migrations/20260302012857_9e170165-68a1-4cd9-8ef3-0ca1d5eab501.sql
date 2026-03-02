
-- Add subscription_status column to barbershops
ALTER TABLE public.barbershops ADD COLUMN subscription_status text NOT NULL DEFAULT 'trial';

-- Update existing rows based on current state
UPDATE public.barbershops SET subscription_status = CASE
  WHEN subscription_active = true AND trial_ends_at IS NOT NULL AND trial_ends_at > now() THEN 'trial'
  WHEN subscription_active = true THEN 'active'
  ELSE 'expired'
END;

-- Update the trigger to read selected_plan from user metadata
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
  v_selected_plan text;
  v_max_barbers integer;
BEGIN
  v_is_invite := COALESCE((NEW.raw_user_meta_data->>'is_barber_invite')::BOOLEAN, FALSE);
  
  IF v_is_invite THEN
    RETURN NEW;
  END IF;

  -- Read selected plan from signup metadata (default to 'basic')
  v_selected_plan := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'basic');
  v_max_barbers := public.get_plan_limit(v_selected_plan);
  
  INSERT INTO public.barbershops (name, plan, max_barbers, subscription_status, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'),
    v_selected_plan::plan_type,
    v_max_barbers,
    'trial',
    now() + interval '72 hours'
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
