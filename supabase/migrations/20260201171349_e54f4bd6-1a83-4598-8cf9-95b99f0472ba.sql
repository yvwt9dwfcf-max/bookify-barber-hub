-- Tabela de junção: relaciona barbeiros aos serviços que eles oferecem
CREATE TABLE IF NOT EXISTS public.barber_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

-- Habilitar RLS
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para barber_services
CREATE POLICY "Anyone can view barber_services for booking" 
ON public.barber_services 
FOR SELECT 
USING (true);

CREATE POLICY "Masters can manage barber_services" 
ON public.barber_services 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b 
    WHERE b.id = barber_services.barber_id 
    AND is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

CREATE POLICY "Barbers can manage their own services" 
ON public.barber_services 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b 
    WHERE b.id = barber_services.barber_id 
    AND b.auth_id = auth.uid()
  )
);

-- Migrar dados existentes: vincular todos os barbeiros a todos os serviços de sua barbearia
-- Primeiro, garantir que os serviços que tinham barber_id agora tenham barbershop_id correto
UPDATE public.services s
SET barbershop_id = (
  SELECT barbershop_id FROM public.barbers b WHERE b.id = s.barber_id
)
WHERE s.barbershop_id IS NULL AND s.barber_id IS NOT NULL;

-- Migrar: criar vínculos para barbeiros com seus próprios serviços (dados legados)
INSERT INTO public.barber_services (barber_id, service_id)
SELECT s.barber_id, s.id
FROM public.services s
WHERE s.barber_id IS NOT NULL
ON CONFLICT (barber_id, service_id) DO NOTHING;

-- Adicionar os demais barbeiros da mesma barbearia aos mesmos serviços
INSERT INTO public.barber_services (barber_id, service_id)
SELECT DISTINCT b.id, s.id
FROM public.barbers b
JOIN public.services s ON s.barbershop_id = b.barbershop_id
WHERE b.is_active = true
ON CONFLICT (barber_id, service_id) DO NOTHING;

-- Habilitar realtime para a nova tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_services;