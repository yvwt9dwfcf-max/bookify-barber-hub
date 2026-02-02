-- WhatsApp settings table (barbershop level)
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

-- Barber WhatsApp settings (individual level)
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

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_whatsapp ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_settings (only master can manage)
CREATE POLICY "Masters can view their barbershop whatsapp settings"
ON public.whatsapp_settings FOR SELECT
USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Masters can insert their barbershop whatsapp settings"
ON public.whatsapp_settings FOR INSERT
WITH CHECK (
  barbershop_id = public.get_user_barbershop_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'master')
);

CREATE POLICY "Masters can update their barbershop whatsapp settings"
ON public.whatsapp_settings FOR UPDATE
USING (
  barbershop_id = public.get_user_barbershop_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'master')
);

-- RLS Policies for barber_whatsapp
CREATE POLICY "Users can view whatsapp settings from same barbershop"
ON public.barber_whatsapp FOR SELECT
USING (
  barber_id IN (
    SELECT id FROM public.barbers 
    WHERE barbershop_id = public.get_user_barbershop_id(auth.uid())
  )
);

CREATE POLICY "Barbers can insert their own whatsapp settings"
ON public.barber_whatsapp FOR INSERT
WITH CHECK (
  barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
);

CREATE POLICY "Barbers can update their own whatsapp settings"
ON public.barber_whatsapp FOR UPDATE
USING (
  barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barber_whatsapp_updated_at
BEFORE UPDATE ON public.barber_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();