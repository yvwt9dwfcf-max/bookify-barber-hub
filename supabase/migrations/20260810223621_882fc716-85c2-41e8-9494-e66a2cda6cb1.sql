CREATE TABLE IF NOT EXISTS public.barber_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);
GRANT SELECT ON public.barber_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_services TO authenticated;
GRANT ALL ON public.barber_services TO service_role;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view barber_services for booking" ON public.barber_services FOR SELECT USING (true);
CREATE POLICY "Masters can manage barber_services" ON public.barber_services FOR ALL
USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_services.barber_id AND is_master_of_barbershop(auth.uid(), b.barbershop_id)));
CREATE POLICY "Barbers can manage their own services" ON public.barber_services FOR ALL
USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_services.barber_id AND b.auth_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_services;

ALTER TABLE public.opening_hours
ADD COLUMN break_start time without time zone DEFAULT NULL,
ADD COLUMN break_end time without time zone DEFAULT NULL;

CREATE TABLE public.whatsapp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'global' CHECK (mode IN ('global', 'individual')),
  global_phone TEXT,
  global_message TEXT DEFAULT 'Olá 👋
Para agendar seu horário, clique no link abaixo:
{{LINK_AGENDAMENTO}}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.barber_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  phone TEXT,
  message TEXT DEFAULT 'Olá 👋
Para agendar seu horário, clique no link abaixo:
{{LINK_AGENDAMENTO}}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_whatsapp TO authenticated;
GRANT ALL ON public.barber_whatsapp TO service_role;
ALTER TABLE public.barber_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view their barbershop whatsapp settings" ON public.whatsapp_settings FOR SELECT
USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Masters can insert their barbershop whatsapp settings" ON public.whatsapp_settings FOR INSERT
WITH CHECK (barbershop_id = public.get_user_barbershop_id(auth.uid()) AND public.has_role(auth.uid(), 'master'));
CREATE POLICY "Masters can update their barbershop whatsapp settings" ON public.whatsapp_settings FOR UPDATE
USING (barbershop_id = public.get_user_barbershop_id(auth.uid()) AND public.has_role(auth.uid(), 'master'));

CREATE POLICY "Users can view whatsapp settings from same barbershop" ON public.barber_whatsapp FOR SELECT
USING (barber_id IN (SELECT id FROM public.barbers WHERE barbershop_id = public.get_user_barbershop_id(auth.uid())));
CREATE POLICY "Barbers can insert their own whatsapp settings" ON public.barber_whatsapp FOR INSERT
WITH CHECK (barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid()));
CREATE POLICY "Barbers can update their own whatsapp settings" ON public.barber_whatsapp FOR UPDATE
USING (barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid()));

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_barber_whatsapp_updated_at BEFORE UPDATE ON public.barber_whatsapp
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.barbershops ADD COLUMN monthly_goal numeric DEFAULT NULL;
ALTER TABLE public.barbershops ADD COLUMN closing_time text DEFAULT NULL;

DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
CREATE POLICY "Users can create appointments with permission check"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() IS NULL OR can_barber_edit_schedule(auth.uid(), barber_id));