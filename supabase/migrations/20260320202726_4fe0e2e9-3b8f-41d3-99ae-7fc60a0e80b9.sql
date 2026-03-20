ALTER TABLE public.barbershops ADD COLUMN tutorial_completed boolean NOT NULL DEFAULT false;

-- Mark existing accounts as completed so they don't see the tutorial
UPDATE public.barbershops SET tutorial_completed = true WHERE onboarding_completed = true;