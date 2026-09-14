CREATE OR REPLACE FUNCTION public.enforce_barbershop_gallery_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.barbershop_gallery
    WHERE barbershop_id = NEW.barbershop_id
  ) >= 12 THEN
    RAISE EXCEPTION 'Limite de 12 fotos atingido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_barbershop_gallery_limit_trigger ON public.barbershop_gallery;
CREATE TRIGGER enforce_barbershop_gallery_limit_trigger
BEFORE INSERT ON public.barbershop_gallery
FOR EACH ROW
EXECUTE FUNCTION public.enforce_barbershop_gallery_limit();