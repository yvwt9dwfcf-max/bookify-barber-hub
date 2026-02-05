-- Step 1: Remove the default value constraint first
ALTER TABLE public.barbershops ALTER COLUMN plan DROP DEFAULT;

-- Step 2: Convert column to text temporarily
ALTER TABLE public.barbershops ALTER COLUMN plan TYPE text;

-- Step 3: Drop the old enum with cascade
DROP TYPE IF EXISTS public.plan_type CASCADE;

-- Step 4: Create new plan_type enum with new plan names
CREATE TYPE public.plan_type AS ENUM ('basic', 'plus', 'pro', 'studio', 'rede');

-- Step 5: Convert column back to enum and set default
ALTER TABLE public.barbershops 
  ALTER COLUMN plan TYPE public.plan_type USING plan::public.plan_type,
  ALTER COLUMN plan SET DEFAULT 'basic'::public.plan_type;

-- Step 6: Add subscription_active column
ALTER TABLE public.barbershops 
  ADD COLUMN IF NOT EXISTS subscription_active boolean NOT NULL DEFAULT true;

-- Step 7: Update max_barbers based on new plan limits
-- basic = 1, plus = 3, pro = 6, studio = 12, rede = 20
UPDATE public.barbershops 
SET max_barbers = CASE plan::text
  WHEN 'basic' THEN 1
  WHEN 'plus' THEN 3
  WHEN 'pro' THEN 6
  WHEN 'studio' THEN 12
  WHEN 'rede' THEN 20
  ELSE 1
END;

-- Step 8: Create function to get plan limit
CREATE OR REPLACE FUNCTION public.get_plan_limit(plan_name text)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT CASE plan_name
    WHEN 'basic' THEN 1
    WHEN 'plus' THEN 3
    WHEN 'pro' THEN 6
    WHEN 'studio' THEN 12
    WHEN 'rede' THEN 20
    ELSE 1
  END
$$;

-- Step 9: Create function to check subscription status
CREATE OR REPLACE FUNCTION public.is_subscription_active(_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(subscription_active, true) 
  FROM public.barbershops 
  WHERE id = _barbershop_id
$$;