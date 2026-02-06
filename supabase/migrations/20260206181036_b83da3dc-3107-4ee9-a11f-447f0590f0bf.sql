
-- Add closing_time column to barbershops (HH:mm format stored as text)
ALTER TABLE public.barbershops ADD COLUMN closing_time text DEFAULT NULL;

-- Allow masters to continue updating their barbershop (column is included in existing UPDATE policy)
COMMENT ON COLUMN public.barbershops.closing_time IS 'Horário de encerramento do dia no formato HH:mm';
