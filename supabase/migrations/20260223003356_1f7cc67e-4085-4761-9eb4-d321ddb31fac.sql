
-- Create a trigger function to enforce barber limit at database level
CREATE OR REPLACE FUNCTION public.enforce_barber_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Only check on insert or when reactivating (is_active changing to true)
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    SELECT COUNT(*) INTO current_count
    FROM public.barbers
    WHERE barbershop_id = NEW.barbershop_id AND is_active = true;

    SELECT max_barbers INTO max_allowed
    FROM public.barbershops
    WHERE id = NEW.barbershop_id;

    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Limite de barbeiros do seu plano atingido (% de %)', current_count, max_allowed;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
    SELECT COUNT(*) INTO current_count
    FROM public.barbers
    WHERE barbershop_id = NEW.barbershop_id AND is_active = true;

    SELECT max_barbers INTO max_allowed
    FROM public.barbershops
    WHERE id = NEW.barbershop_id;

    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Limite de barbeiros do seu plano atingido (% de %)', current_count, max_allowed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach the trigger
DROP TRIGGER IF EXISTS check_barber_limit ON public.barbers;
CREATE TRIGGER check_barber_limit
  BEFORE INSERT OR UPDATE ON public.barbers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_barber_limit();
