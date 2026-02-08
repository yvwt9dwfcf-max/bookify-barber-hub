
-- Add onboarding_completed flag to barbershops
ALTER TABLE public.barbershops 
ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark all existing barbershops as onboarding completed (they already set up)
UPDATE public.barbershops SET onboarding_completed = true 
WHERE id IN (
  SELECT DISTINCT barbershop_id FROM public.opening_hours
);

-- Add phone column to barbershops if not exists
ALTER TABLE public.barbershops 
ADD COLUMN phone text;
