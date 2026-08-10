-- Tabela de barbeiros (profiles)
CREATE TABLE public.barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.opening_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, day_of_week)
);

CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.barbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.opening_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opening_hours TO authenticated;
GRANT ALL ON public.opening_hours TO service_role;
GRANT SELECT ON public.blocked_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_slots TO authenticated;
GRANT ALL ON public.blocked_slots TO service_role;
GRANT SELECT, INSERT ON public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

CREATE INDEX idx_appointments_barber_date ON public.appointments(barber_id, start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_services_barber ON public.services(barber_id);
CREATE INDEX idx_blocked_slots_barber ON public.blocked_slots(barber_id, start_time);

CREATE OR REPLACE FUNCTION public.is_barber_owner(p_barber_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbers WHERE id = p_barber_id AND auth_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.get_current_barber_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.barbers WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_barber()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.barbers (auth_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Barbeiro'), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_barber();

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver barbeiros" ON public.barbers FOR SELECT USING (true);
CREATE POLICY "Barbeiro pode atualizar seu próprio perfil" ON public.barbers FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Qualquer um pode ver serviços ativos" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Barbeiro pode inserir seus serviços" ON public.services FOR INSERT WITH CHECK (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode atualizar seus serviços" ON public.services FOR UPDATE USING (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode deletar seus serviços" ON public.services FOR DELETE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Qualquer um pode ver horários de funcionamento" ON public.opening_hours FOR SELECT USING (true);
CREATE POLICY "Barbeiro pode gerenciar seus horários" ON public.opening_hours FOR INSERT WITH CHECK (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode atualizar seus horários" ON public.opening_hours FOR UPDATE USING (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode deletar seus horários" ON public.opening_hours FOR DELETE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Qualquer um pode ver slots bloqueados" ON public.blocked_slots FOR SELECT USING (true);
CREATE POLICY "Barbeiro pode gerenciar slots bloqueados" ON public.blocked_slots FOR INSERT WITH CHECK (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode atualizar slots bloqueados" ON public.blocked_slots FOR UPDATE USING (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode deletar slots bloqueados" ON public.blocked_slots FOR DELETE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Qualquer um pode ver agendamentos para verificar disponibilidade" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode criar agendamento" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Barbeiro pode atualizar seus agendamentos" ON public.appointments FOR UPDATE USING (public.is_barber_owner(barber_id));
CREATE POLICY "Barbeiro pode deletar seus agendamentos" ON public.appointments FOR DELETE USING (public.is_barber_owner(barber_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;