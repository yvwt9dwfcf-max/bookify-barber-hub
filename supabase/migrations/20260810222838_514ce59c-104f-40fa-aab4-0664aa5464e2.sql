CREATE TYPE public.app_role AS ENUM ('master', 'barber');
CREATE TYPE public.plan_type AS ENUM ('basic', 'pro', 'advanced');

CREATE TABLE public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan plan_type NOT NULL DEFAULT 'basic',
  max_barbers INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barbershops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershops TO authenticated;
GRANT ALL ON public.barbershops TO service_role;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, barbershop_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.barber_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_edit_own_schedule BOOLEAN NOT NULL DEFAULT true,
  can_view_others_schedule BOOLEAN NOT NULL DEFAULT false,
  can_edit_others_schedule BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_permissions TO authenticated;
GRANT ALL ON public.barber_permissions TO service_role;
ALTER TABLE public.barber_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.barbers ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.barbers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.appointments ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.opening_hours ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.blocked_slots ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_barber_permissions_updated_at BEFORE UPDATE ON public.barber_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT barbershop_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_master_of_barbershop(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND barbershop_id = _barbershop_id AND role = 'master'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_barber_permissions(_barber_id UUID)
RETURNS TABLE(can_edit_own_schedule BOOLEAN, can_view_others_schedule BOOLEAN, can_edit_others_schedule BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bp.can_edit_own_schedule, bp.can_view_others_schedule, bp.can_edit_others_schedule
  FROM public.barber_permissions bp WHERE bp.barber_id = _barber_id
$$;

CREATE OR REPLACE FUNCTION public.can_barber_edit_schedule(_user_id UUID, _target_barber_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_barber_id UUID;
  v_user_role app_role;
  v_can_edit_own BOOLEAN;
  v_can_edit_others BOOLEAN;
BEGIN
  SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = _user_id;
  IF v_user_role = 'master' THEN RETURN TRUE; END IF;
  SELECT id INTO v_user_barber_id FROM public.barbers WHERE auth_id = _user_id;
  IF v_user_barber_id = _target_barber_id THEN
    SELECT bp.can_edit_own_schedule INTO v_can_edit_own FROM public.barber_permissions bp WHERE bp.barber_id = v_user_barber_id;
    RETURN COALESCE(v_can_edit_own, TRUE);
  ELSE
    SELECT bp.can_edit_others_schedule INTO v_can_edit_others FROM public.barber_permissions bp WHERE bp.barber_id = v_user_barber_id;
    RETURN COALESCE(v_can_edit_others, FALSE);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_barber_view_schedule(_user_id UUID, _target_barber_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_barber_id UUID;
  v_user_role app_role;
  v_can_view_others BOOLEAN;
BEGIN
  SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = _user_id;
  IF v_user_role = 'master' THEN RETURN TRUE; END IF;
  SELECT id INTO v_user_barber_id FROM public.barbers WHERE auth_id = _user_id;
  IF v_user_barber_id = _target_barber_id THEN RETURN TRUE; END IF;
  SELECT bp.can_view_others_schedule INTO v_can_view_others FROM public.barber_permissions bp WHERE bp.barber_id = v_user_barber_id;
  RETURN COALESCE(v_can_view_others, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.count_barbers_in_barbershop(_barbershop_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.barbers WHERE barbershop_id = _barbershop_id AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.can_add_barber(_barbershop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT COUNT(*) FROM public.barbers WHERE barbershop_id = _barbershop_id AND is_active = true)
       < (SELECT max_barbers FROM public.barbershops WHERE id = _barbershop_id)
$$;

CREATE POLICY "Users can view their own barbershop" ON public.barbershops FOR SELECT USING (id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Anyone can view barbershops for public booking" ON public.barbershops FOR SELECT USING (true);
CREATE POLICY "Masters can update their barbershop" ON public.barbershops FOR UPDATE USING (public.is_master_of_barbershop(auth.uid(), id));

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Masters can view roles in their barbershop" ON public.user_roles FOR SELECT USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can insert roles in their barbershop" ON public.user_roles FOR INSERT WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id) AND role = 'barber');
CREATE POLICY "Masters can delete barber roles in their barbershop" ON public.user_roles FOR DELETE USING (public.is_master_of_barbershop(auth.uid(), barbershop_id) AND role = 'barber');

CREATE POLICY "Masters can view permissions in their barbershop" ON public.barber_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)));
CREATE POLICY "Barbers can view their own permissions" ON public.barber_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.auth_id = auth.uid()));
CREATE POLICY "Masters can insert permissions" ON public.barber_permissions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)));
CREATE POLICY "Masters can update permissions" ON public.barber_permissions FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)));
CREATE POLICY "Masters can delete permissions" ON public.barber_permissions FOR DELETE
USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)));

DROP POLICY IF EXISTS "Qualquer um pode ver barbeiros" ON public.barbers;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seu próprio perfil" ON public.barbers;
CREATE POLICY "Anyone can view active barbers for public booking" ON public.barbers FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view barbers in their barbershop" ON public.barbers FOR SELECT USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Masters can insert barbers in their barbershop" ON public.barbers FOR INSERT
WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id) AND public.can_add_barber(barbershop_id));
CREATE POLICY "Barbers can update their own profile" ON public.barbers FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "Masters can update barbers in their barbershop" ON public.barbers FOR UPDATE USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can delete barbers in their barbershop" ON public.barbers FOR DELETE USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "Qualquer um pode ver agendamentos para verificar disponibilidade" ON public.appointments;
DROP POLICY IF EXISTS "Qualquer um pode criar agendamento" ON public.appointments;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seus agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Barbeiro pode deletar seus agendamentos" ON public.appointments;
CREATE POLICY "Anyone can view appointments for availability check" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Anyone can create appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update appointments based on permissions" ON public.appointments FOR UPDATE USING (public.can_barber_edit_schedule(auth.uid(), barber_id));
CREATE POLICY "Users can delete appointments based on permissions" ON public.appointments FOR DELETE USING (public.can_barber_edit_schedule(auth.uid(), barber_id));

DROP POLICY IF EXISTS "Qualquer um pode ver serviços ativos" ON public.services;
DROP POLICY IF EXISTS "Barbeiro pode inserir seus serviços" ON public.services;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seus serviços" ON public.services;
DROP POLICY IF EXISTS "Barbeiro pode deletar seus serviços" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Users can view services in their barbershop" ON public.services FOR SELECT USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Barbers can insert services" ON public.services FOR INSERT WITH CHECK (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbers can update their services" ON public.services FOR UPDATE USING (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbers can delete their services" ON public.services FOR DELETE USING (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "Qualquer um pode ver horários de funcionamento" ON public.opening_hours;
DROP POLICY IF EXISTS "Barbeiro pode gerenciar seus horários" ON public.opening_hours;
DROP POLICY IF EXISTS "Barbeiro pode atualizar seus horários" ON public.opening_hours;
DROP POLICY IF EXISTS "Barbeiro pode deletar seus horários" ON public.opening_hours;
CREATE POLICY "Anyone can view opening hours" ON public.opening_hours FOR SELECT USING (true);
CREATE POLICY "Barbers can insert their hours" ON public.opening_hours FOR INSERT WITH CHECK (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbers can update their hours" ON public.opening_hours FOR UPDATE USING (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbers can delete their hours" ON public.opening_hours FOR DELETE USING (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "Qualquer um pode ver slots bloqueados" ON public.blocked_slots;
DROP POLICY IF EXISTS "Barbeiro pode gerenciar slots bloqueados" ON public.blocked_slots;
DROP POLICY IF EXISTS "Barbeiro pode atualizar slots bloqueados" ON public.blocked_slots;
DROP POLICY IF EXISTS "Barbeiro pode deletar slots bloqueados" ON public.blocked_slots;
CREATE POLICY "Anyone can view blocked slots" ON public.blocked_slots FOR SELECT USING (true);
CREATE POLICY "Barbers can insert blocked slots" ON public.blocked_slots FOR INSERT WITH CHECK (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbers can update blocked slots" ON public.blocked_slots FOR UPDATE USING (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbers can delete blocked slots" ON public.blocked_slots FOR DELETE USING (public.is_barber_owner(barber_id) OR public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
  v_is_invite BOOLEAN;
BEGIN
  v_is_invite := COALESCE((NEW.raw_user_meta_data->>'is_barber_invite')::BOOLEAN, FALSE);
  IF v_is_invite THEN RETURN NEW; END IF;

  INSERT INTO public.barbershops (name, plan, max_barbers)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'), 'basic', 3)
  RETURNING id INTO v_barbershop_id;

  INSERT INTO public.barbers (auth_id, name, email, barbershop_id, is_active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Barbeiro'), NEW.email, v_barbershop_id, true)
  RETURNING id INTO v_barber_id;

  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (NEW.id, 'master', v_barbershop_id);

  INSERT INTO public.barber_permissions (barber_id, can_edit_own_schedule, can_view_others_schedule, can_edit_others_schedule)
  VALUES (v_barber_id, true, true, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_barbershop();

ALTER PUBLICATION supabase_realtime ADD TABLE public.barbershops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_permissions;