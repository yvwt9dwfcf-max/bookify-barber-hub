
-- Add trial and subscription fields to barbershops
ALTER TABLE public.barbershops 
  ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '3 days');

-- Update existing barbershops to have trial started now
UPDATE public.barbershops 
SET trial_started_at = now(), 
    trial_ends_at = now() + interval '3 days'
WHERE trial_started_at IS NULL;
