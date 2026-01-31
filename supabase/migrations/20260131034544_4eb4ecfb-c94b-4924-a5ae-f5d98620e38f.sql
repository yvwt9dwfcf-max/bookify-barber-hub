-- Update the trigger function to handle barber invites correctly
-- When is_barber_invite is true, the barber was already created by the master
-- so we should NOT create a new barbershop

CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
  v_is_invite BOOLEAN;
BEGIN
  -- Check if this is a barber invite (created by a master)
  v_is_invite := COALESCE((NEW.raw_user_meta_data->>'is_barber_invite')::BOOLEAN, FALSE);
  
  -- If this is a barber invite, don't create anything
  -- The barber record and role were already created by the master
  IF v_is_invite THEN
    RETURN NEW;
  END IF;
  
  -- Create a new barbershop for new users
  INSERT INTO public.barbershops (name, plan, max_barbers)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'),
    'basic',
    3
  )
  RETURNING id INTO v_barbershop_id;
  
  -- Create the barber profile linked to barbershop
  INSERT INTO public.barbers (auth_id, name, email, barbershop_id, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Barbeiro'),
    NEW.email,
    v_barbershop_id,
    true
  )
  RETURNING id INTO v_barber_id;
  
  -- Set user as master of the barbershop
  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (NEW.id, 'master', v_barbershop_id);
  
  -- Create default permissions for the barber
  INSERT INTO public.barber_permissions (barber_id, can_edit_own_schedule, can_view_others_schedule, can_edit_others_schedule)
  VALUES (v_barber_id, true, true, true);
  
  RETURN NEW;
END;
$$;