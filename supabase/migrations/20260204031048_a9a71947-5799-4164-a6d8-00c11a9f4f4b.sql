-- Add monthly_goal column to barbershops table
ALTER TABLE public.barbershops 
ADD COLUMN monthly_goal numeric DEFAULT NULL;

-- Allow masters to update the monthly_goal
COMMENT ON COLUMN public.barbershops.monthly_goal IS 'Meta mensal de faturamento em reais';