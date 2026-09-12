DROP TRIGGER IF EXISTS validate_public_profile_appearance ON public.public_profiles;

UPDATE public.public_profiles
SET font_style = 'luckiest_guy'
WHERE font_style = 'anton';

CREATE OR REPLACE FUNCTION public.validate_public_profile_appearance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.theme_style NOT IN ('editorial', 'urbano') THEN
    RAISE EXCEPTION 'Estilo visual inválido';
  END IF;

  IF NEW.font_style NOT IN ('playfair', 'luckiest_guy') THEN
    RAISE EXCEPTION 'Estilo de fonte inválido';
  END IF;

  IF NEW.accent_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor de destaque inválida';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_public_profile_appearance
BEFORE INSERT OR UPDATE OF theme_style, font_style, accent_color
ON public.public_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_public_profile_appearance();