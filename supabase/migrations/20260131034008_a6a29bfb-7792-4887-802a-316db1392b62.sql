-- Create role enum
CREATE TYPE public.app_role AS ENUM ('master', 'barber');

-- Create plan enum for barbershop limits
CREATE TYPE public.plan_type AS ENUM ('basic', 'pro', 'advanced');

-- Create barbershops table
CREATE TABLE public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan plan_type NOT NULL DEFAULT 'basic',
  max_barbers INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on barbershops
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (following security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, barbershop_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create barber_permissions table
CREATE TABLE public.barber_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_edit_own_schedule BOOLEAN NOT NULL DEFAULT true,
  can_view_others_schedule BOOLEAN NOT NULL DEFAULT false,
  can_edit_others_schedule BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on barber_permissions
ALTER TABLE public.barber_permissions ENABLE ROW LEVEL SECURITY;

-- Add barbershop_id to barbers table
ALTER TABLE public.barbers ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add is_active column to barbers
ALTER TABLE public.barbers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add barbershop_id to appointments table for easier querying
ALTER TABLE public.appointments ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to services table
ALTER TABLE public.services ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to opening_hours table
ALTER TABLE public.opening_hours ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to blocked_slots table
ALTER TABLE public.blocked_slots ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Create trigger for updated_at on barbershops
CREATE TRIGGER update_barbershops_updated_at
BEFORE UPDATE ON public.barbershops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on barber_permissions
CREATE TRIGGER update_barber_permissions_updated_at
BEFORE UPDATE ON public.barber_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's barbershop_id
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Security definer function to check if user is master of barbershop
CREATE OR REPLACE FUNCTION public.is_master_of_barbershop(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND barbershop_id = _barbershop_id 
    AND role = 'master'
  )
$$;

-- Security definer function to get barber's permissions
CREATE OR REPLACE FUNCTION public.get_barber_permissions(_barber_id UUID)
RETURNS TABLE(can_edit_own_schedule BOOLEAN, can_view_others_schedule BOOLEAN, can_edit_others_schedule BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.can_edit_own_schedule, bp.can_view_others_schedule, bp.can_edit_others_schedule
  FROM public.barber_permissions bp
  WHERE bp.barber_id = _barber_id
$$;

-- Security definer function to check if barber can edit schedule
CREATE OR REPLACE FUNCTION public.can_barber_edit_schedule(_user_id UUID, _target_barber_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_barber_id UUID;
  v_user_role app_role;
  v_can_edit_own BOOLEAN;
  v_can_edit_others BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = _user_id;
  
  -- Masters can always edit
  IF v_user_role = 'master' THEN
    RETURN TRUE;
  END IF;
  
  -- Get barber id for this user
  SELECT id INTO v_user_barber_id FROM public.barbers WHERE auth_id = _user_id;
  
  -- If editing own schedule
  IF v_user_barber_id = _target_barber_id THEN
    SELECT bp.can_edit_own_schedule INTO v_can_edit_own
    FROM public.barber_permissions bp
    WHERE bp.barber_id = v_user_barber_id;
    RETURN COALESCE(v_can_edit_own, TRUE);
  ELSE
    -- If editing others' schedule
    SELECT bp.can_edit_others_schedule INTO v_can_edit_others
    FROM public.barber_permissions bp
    WHERE bp.barber_id = v_user_barber_id;
    RETURN COALESCE(v_can_edit_others, FALSE);
  END IF;
END;
$$;

-- Security definer function to check if barber can view schedule
CREATE OR REPLACE FUNCTION public.can_barber_view_schedule(_user_id UUID, _target_barber_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_barber_id UUID;
  v_user_role app_role;
  v_can_view_others BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = _user_id;
  
  -- Masters can always view
  IF v_user_role = 'master' THEN
    RETURN TRUE;
  END IF;
  
  -- Get barber id for this user
  SELECT id INTO v_user_barber_id FROM public.barbers WHERE auth_id = _user_id;
  
  -- If viewing own schedule, always allowed
  IF v_user_barber_id = _target_barber_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if can view others
  SELECT bp.can_view_others_schedule INTO v_can_view_others
  FROM public.barber_permissions bp
  WHERE bp.barber_id = v_user_barber_id;
  
  RETURN COALESCE(v_can_view_others, FALSE);
END;
$$;

-- Security definer function to count barbers in barbershop
CREATE OR REPLACE FUNCTION public.count_barbers_in_barbershop(_barbershop_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.barbers WHERE barbershop_id = _barbershop_id AND is_active = true
$$;

-- Security definer function to check if can add more barbers
CREATE OR REPLACE FUNCTION public.can_add_barber(_barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.barbers WHERE barbershop_id = _barbershop_id AND is_active = true
  ) < (
    SELECT max_barbers FROM public.barbershops WHERE id = _barbershop_id
  )
$$;

-- RLS Policies for barbershops
CREATE POLICY "Users can view their own barbershop"
ON public.barbershops FOR SELECT
USING (id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Anyone can view barbershops for public booking"
ON public.barbershops FOR SELECT
USING (true);

CREATE POLICY "Masters can update their barbershop"
ON public.barbershops FOR UPDATE
USING (public.is_master_of_barbershop(auth.uid(), id));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Masters can view roles in their barbershop"
ON public.user_roles FOR SELECT
USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can insert roles in their barbershop"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id) AND role = 'barber');

CREATE POLICY "Masters can delete barber roles in their barbershop"
ON public.user_roles FOR DELETE
USING (public.is_master_of_barbershop(auth.uid(), barbershop_id) AND role = 'barber');

-- RLS Policies for barber_permissions
CREATE POLICY "Masters can view permissions in their barbershop"
ON public.barber_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_id
    AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

CREATE POLICY "Barbers can view their own permissions"
ON public.barber_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_id AND b.auth_id = auth.uid()
  )
);

CREATE POLICY "Masters can insert permissions"
ON public.barber_permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_id
    AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

CREATE POLICY "Masters can update permissions"
ON public.barber_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_id
    AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

CREATE POLICY "Masters can delete permissions"
ON public.barber_permissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_id
    AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

-- Update barbers RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver barbeiros" ON public.barbers;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seu próprio perfil" ON public.barbers;

CREATE POLICY "Anyone can view active barbers for public booking"
ON public.barbers FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view barbers in their barbershop"
ON public.barbers FOR SELECT
USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Masters can insert barbers in their barbershop"
ON public.barbers FOR INSERT
WITH CHECK (
  public.is_master_of_barbershop(auth.uid(), barbershop_id)
  AND public.can_add_barber(barbershop_id)
);

CREATE POLICY "Barbers can update their own profile"
ON public.barbers FOR UPDATE
USING (auth_id = auth.uid());

CREATE POLICY "Masters can update barbers in their barbershop"
ON public.barbers FOR UPDATE
USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can delete barbers in their barbershop"
ON public.barbers FOR DELETE
USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

-- Update appointments RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver agendamentos para verificar disponibilidad" ON public.appointments;
DROP POLICY IF EXISTS "Qualquer um pode criar agendamento" ON public.appointments;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seus agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Barbeiro pode deletar seus agendamentos" ON public.appointments;

CREATE POLICY "Anyone can view appointments for availability check"
ON public.appointments FOR SELECT
USING (true);

CREATE POLICY "Anyone can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update appointments based on permissions"
ON public.appointments FOR UPDATE
USING (public.can_barber_edit_schedule(auth.uid(), barber_id));

CREATE POLICY "Users can delete appointments based on permissions"
ON public.appointments FOR DELETE
USING (public.can_barber_edit_schedule(auth.uid(), barber_id));

-- Update services RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver serviços ativos" ON public.services;
DROP POLICY IF EXISTS "Barbeiro pode inserir seus serviços" ON public.services;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seus serviços" ON public.services;
DROP POLICY IF EXISTS "Barbeiro pode deletar seus serviços" ON public.services;

CREATE POLICY "Anyone can view active services"
ON public.services FOR SELECT
USING (active = true);

CREATE POLICY "Users can view services in their barbershop"
ON public.services FOR SELECT
USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Barbers can insert services"
ON public.services FOR INSERT
WITH CHECK (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

CREATE POLICY "Barbers can update their services"
ON public.services FOR UPDATE
USING (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

CREATE POLICY "Barbers can delete their services"
ON public.services FOR DELETE
USING (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

-- Update opening_hours RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver horários de funcionamento" ON public.opening_hours;
DROP POLICY IF EXISTS "Barbeiro pode gerenciar seus horários" ON public.opening_hours;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seus horários" ON public.opening_hours;
DROP POLICY IF EXISTS "Barbeiro pode deletar seus horários" ON public.opening_hours;

CREATE POLICY "Anyone can view opening hours"
ON public.opening_hours FOR SELECT
USING (true);

CREATE POLICY "Barbers can insert their hours"
ON public.opening_hours FOR INSERT
WITH CHECK (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

CREATE POLICY "Barbers can update their hours"
ON public.opening_hours FOR UPDATE
USING (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

CREATE POLICY "Barbers can delete their hours"
ON public.opening_hours FOR DELETE
USING (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

-- Update blocked_slots RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver slots bloqueados" ON public.blocked_slots;
DROP POLICY IF EXISTS "Barbeiro pode gerenciar slots bloqueados" ON public.blocked_slots;
DROP POLICY IF EXISTS "Barbeiro pode atualizar slots bloqueados" ON public.blocked_slots;
DROP POLICY IF EXISTS "Barbeiro pode deletar slots bloqueados" ON public.blocked_slots;

CREATE POLICY "Anyone can view blocked slots"
ON public.blocked_slots FOR SELECT
USING (true);

CREATE POLICY "Barbers can insert blocked slots"
ON public.blocked_slots FOR INSERT
WITH CHECK (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

CREATE POLICY "Barbers can update blocked slots"
ON public.blocked_slots FOR UPDATE
USING (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

CREATE POLICY "Barbers can delete blocked slots"
ON public.blocked_slots FOR DELETE
USING (
  public.is_barber_owner(barber_id) 
  OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
);

-- Function to create barbershop and set user as master (for new signups)
CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
BEGIN
  -- Create a new barbershop
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

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_barbershop();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.barbershops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_permissions;