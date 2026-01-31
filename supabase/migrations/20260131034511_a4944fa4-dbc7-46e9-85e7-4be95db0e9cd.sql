-- Migration script to migrate existing barbers to the new multi-barbershop system

DO $$
DECLARE
  v_barber RECORD;
  v_barbershop_id UUID;
  v_existing_role UUID;
BEGIN
  -- Loop through all existing barbers that don't have a barbershop_id
  FOR v_barber IN 
    SELECT * FROM public.barbers WHERE barbershop_id IS NULL
  LOOP
    -- Check if this user already has a role (meaning they were created after the new trigger)
    SELECT id INTO v_existing_role FROM public.user_roles WHERE user_id = v_barber.auth_id;
    
    IF v_existing_role IS NULL THEN
      -- Create a barbershop for this barber
      INSERT INTO public.barbershops (name, plan, max_barbers)
      VALUES (
        COALESCE(v_barber.name || '''s Barbearia', 'Minha Barbearia'),
        'basic',
        3
      )
      RETURNING id INTO v_barbershop_id;
      
      -- Update the barber with the new barbershop_id
      UPDATE public.barbers
      SET barbershop_id = v_barbershop_id
      WHERE id = v_barber.id;
      
      -- Create user role as master
      INSERT INTO public.user_roles (user_id, role, barbershop_id)
      VALUES (v_barber.auth_id, 'master', v_barbershop_id);
      
      -- Create default permissions
      INSERT INTO public.barber_permissions (barber_id, can_edit_own_schedule, can_view_others_schedule, can_edit_others_schedule)
      VALUES (v_barber.id, true, true, true);
      
      -- Update all related records with the barbershop_id
      UPDATE public.services
      SET barbershop_id = v_barbershop_id
      WHERE barber_id = v_barber.id;
      
      UPDATE public.opening_hours
      SET barbershop_id = v_barbershop_id
      WHERE barber_id = v_barber.id;
      
      UPDATE public.blocked_slots
      SET barbershop_id = v_barbershop_id
      WHERE barber_id = v_barber.id;
      
      UPDATE public.appointments
      SET barbershop_id = v_barbershop_id
      WHERE barber_id = v_barber.id;
    END IF;
  END LOOP;
END;
$$;