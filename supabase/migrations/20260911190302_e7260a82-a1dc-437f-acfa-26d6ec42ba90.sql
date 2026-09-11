ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS theme_style text NOT NULL DEFAULT 'editorial',
  ADD COLUMN IF NOT EXISTS font_style text NOT NULL DEFAULT 'playfair',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#22C55E',
  ADD COLUMN IF NOT EXISTS gallery_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.validate_public_profile_appearance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.theme_style NOT IN ('editorial', 'urbano') THEN
    RAISE EXCEPTION 'Estilo visual inválido';
  END IF;

  IF NEW.font_style NOT IN ('playfair', 'anton') THEN
    RAISE EXCEPTION 'Estilo de fonte inválido';
  END IF;

  IF NEW.accent_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor de destaque inválida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_public_profile_appearance ON public.public_profiles;
CREATE TRIGGER validate_public_profile_appearance
BEFORE INSERT OR UPDATE OF theme_style, font_style, accent_color
ON public.public_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_public_profile_appearance();