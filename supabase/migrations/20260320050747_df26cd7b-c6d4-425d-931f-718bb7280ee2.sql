
-- Change default plan for new signups from 'basic' to 'pro'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Default new accounts to 'pro' plan for trial
  v_selected_plan := 'pro';
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

  RETURN NEW;
END;
$$;
