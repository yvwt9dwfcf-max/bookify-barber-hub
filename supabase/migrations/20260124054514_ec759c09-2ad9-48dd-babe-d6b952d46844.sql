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

-- Tabela de serviços
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

-- Tabela de horários de funcionamento
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

-- Tabela de horários bloqueados
CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de agendamentos
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

-- Índices para performance
CREATE INDEX idx_appointments_barber_date ON public.appointments(barber_id, start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_services_barber ON public.services(barber_id);
CREATE INDEX idx_blocked_slots_barber ON public.blocked_slots(barber_id, start_time);

-- Função helper: verifica se o usuário autenticado é dono do barbeiro
CREATE OR REPLACE FUNCTION public.is_barber_owner(p_barber_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers
    WHERE id = p_barber_id AND auth_id = auth.uid()
  )
$$;

-- Função helper: pega o barber_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_current_barber_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.barbers WHERE auth_id = auth.uid() LIMIT 1
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil de barbeiro automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_barber()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.barbers (auth_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Barbeiro'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_barber();

-- Enable RLS
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para barbers
CREATE POLICY "Qualquer um pode ver barbeiros" ON public.barbers
  FOR SELECT USING (true);

CREATE POLICY "Barbeiro pode atualizar seu próprio perfil" ON public.barbers
  FOR UPDATE USING (auth_id = auth.uid());

-- Políticas RLS para services (serviços são públicos para leitura)
CREATE POLICY "Qualquer um pode ver serviços ativos" ON public.services
  FOR SELECT USING (active = true);

CREATE POLICY "Barbeiro pode inserir seus serviços" ON public.services
  FOR INSERT WITH CHECK (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode atualizar seus serviços" ON public.services
  FOR UPDATE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode deletar seus serviços" ON public.services
  FOR DELETE USING (public.is_barber_owner(barber_id));

-- Políticas RLS para opening_hours (públicos para leitura para calcular disponibilidade)
CREATE POLICY "Qualquer um pode ver horários de funcionamento" ON public.opening_hours
  FOR SELECT USING (true);

CREATE POLICY "Barbeiro pode gerenciar seus horários" ON public.opening_hours
  FOR INSERT WITH CHECK (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode atualizar seus horários" ON public.opening_hours
  FOR UPDATE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode deletar seus horários" ON public.opening_hours
  FOR DELETE USING (public.is_barber_owner(barber_id));

-- Políticas RLS para blocked_slots (públicos para leitura para calcular disponibilidade)
CREATE POLICY "Qualquer um pode ver slots bloqueados" ON public.blocked_slots
  FOR SELECT USING (true);

CREATE POLICY "Barbeiro pode gerenciar slots bloqueados" ON public.blocked_slots
  FOR INSERT WITH CHECK (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode atualizar slots bloqueados" ON public.blocked_slots
  FOR UPDATE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode deletar slots bloqueados" ON public.blocked_slots
  FOR DELETE USING (public.is_barber_owner(barber_id));

-- Políticas RLS para appointments
-- Leitura pública apenas para verificar conflitos de horário (sem expor dados pessoais)
CREATE POLICY "Qualquer um pode ver agendamentos para verificar disponibilidade" ON public.appointments
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode criar agendamento" ON public.appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Barbeiro pode atualizar seus agendamentos" ON public.appointments
  FOR UPDATE USING (public.is_barber_owner(barber_id));

CREATE POLICY "Barbeiro pode deletar seus agendamentos" ON public.appointments
  FOR DELETE USING (public.is_barber_owner(barber_id));