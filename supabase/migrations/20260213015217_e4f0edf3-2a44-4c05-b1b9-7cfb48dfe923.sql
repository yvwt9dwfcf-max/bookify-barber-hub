
-- 1. Rate limiting: prevent anonymous spam on appointments (max 5 per phone per hour)
CREATE OR REPLACE FUNCTION public.check_appointment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Only apply rate limiting for anonymous users
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Count appointments from same phone in last hour
  SELECT COUNT(*) INTO recent_count
  FROM public.appointments
  WHERE customer_phone = NEW.customer_phone
    AND created_at > now() - interval '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Too many appointments from this phone number. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_appointment_rate_limit
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_rate_limit();

-- 2. Fix function search_path for get_plan_limit
CREATE OR REPLACE FUNCTION public.get_plan_limit(plan_name text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
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
