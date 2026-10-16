ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS operation_mode text NOT NULL DEFAULT 'individual';
CREATE OR REPLACE FUNCTION public.validate_operation_mode() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.operation_mode NOT IN ('individual','reception') THEN
    RAISE EXCEPTION 'Modo de operação inválido';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validate_operation_mode ON public.barbershops;
CREATE TRIGGER trg_validate_operation_mode BEFORE INSERT OR UPDATE OF operation_mode ON public.barbershops FOR EACH ROW EXECUTE FUNCTION public.validate_operation_mode();