CREATE OR REPLACE FUNCTION public.generate_slug(input_name text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(trim(input_name));
  base_slug := regexp_replace(base_slug, '[àáâãäå]', 'a', 'g');
  base_slug := regexp_replace(base_slug, '[èéêë]', 'e', 'g');
  base_slug := regexp_replace(base_slug, '[ìíîï]', 'i', 'g');
  base_slug := regexp_replace(base_slug, '[òóôõö]', 'o', 'g');
  base_slug := regexp_replace(base_slug, '[ùúûü]', 'u', 'g');
  base_slug := regexp_replace(base_slug, '[ç]', 'c', 'g');
  base_slug := regexp_replace(base_slug, '[ñ]', 'n', 'g');
  base_slug := regexp_replace(base_slug, '''', '', 'g');
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.barbershops WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_barbershop_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_barbershop_auto_slug
BEFORE INSERT ON public.barbershops
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_barbershop_slug();

ALTER TABLE public.barbershops ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.barbershops ADD COLUMN phone text;
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '3 days');

CREATE OR REPLACE FUNCTION public.check_appointment_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO recent_count FROM public.appointments
  WHERE customer_phone = NEW.customer_phone AND created_at > now() - interval '1 hour';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Too many appointments from this phone number. Please try again later.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_appointment_rate_limit
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.check_appointment_rate_limit();

CREATE OR REPLACE FUNCTION public.get_plan_limit(plan_name text)
RETURNS integer LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE plan_name
    WHEN 'basic' THEN 1
    WHEN 'plus' THEN 3
    WHEN 'pro' THEN 6
    WHEN 'studio' THEN 12
    WHEN 'rede' THEN 20
    ELSE 1
  END
$$;

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS photo_url text;

CREATE TABLE IF NOT EXISTS public.barbershop_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barbershop_gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershop_gallery TO authenticated;
GRANT ALL ON public.barbershop_gallery TO service_role;
ALTER TABLE public.barbershop_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gallery" ON public.barbershop_gallery FOR SELECT USING (true);
CREATE POLICY "Masters can manage gallery" ON public.barbershop_gallery FOR ALL USING (is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Public read barbershop photos" ON storage.objects FOR SELECT USING (bucket_id = 'barbershop-photos');
CREATE POLICY "Auth users upload barbershop photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'barbershop-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update barbershop photos" ON storage.objects FOR UPDATE USING (bucket_id = 'barbershop-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete barbershop photos" ON storage.objects FOR DELETE USING (bucket_id = 'barbershop-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Public read barber photos" ON storage.objects FOR SELECT USING (bucket_id = 'barber-photos');
CREATE POLICY "Auth users upload barber photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'barber-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update barber photos" ON storage.objects FOR UPDATE USING (bucket_id = 'barber-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete barber photos" ON storage.objects FOR DELETE USING (bucket_id = 'barber-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Public read gallery photos" ON storage.objects FOR SELECT USING (bucket_id = 'gallery-photos');
CREATE POLICY "Auth users upload gallery photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update gallery photos" ON storage.objects FOR UPDATE USING (bucket_id = 'gallery-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete gallery photos" ON storage.objects FOR DELETE USING (bucket_id = 'gallery-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view public profile assets" ON storage.objects FOR SELECT USING (bucket_id = 'public-profiles');
CREATE POLICY "Masters can upload public profile assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public-profiles' AND auth.uid() IS NOT NULL);
CREATE POLICY "Masters can update public profile assets" ON storage.objects FOR UPDATE USING (bucket_id = 'public-profiles' AND auth.uid() IS NOT NULL);
CREATE POLICY "Masters can delete public profile assets" ON storage.objects FOR DELETE USING (bucket_id = 'public-profiles' AND auth.uid() IS NOT NULL);

CREATE TABLE public.public_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  foto_capa_url TEXT,
  logo_url TEXT,
  descricao TEXT,
  endereco TEXT,
  numero TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  instagram_url TEXT,
  whatsapp_numero TEXT,
  slug_personalizado TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public profiles" ON public.public_profiles FOR SELECT USING (true);
CREATE POLICY "Masters can insert their public profile" ON public.public_profiles FOR INSERT WITH CHECK (is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can update their public profile" ON public.public_profiles FOR UPDATE USING (is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can delete their public profile" ON public.public_profiles FOR DELETE USING (is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE TRIGGER update_public_profiles_updated_at BEFORE UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.services ADD COLUMN is_global boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.enforce_barber_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    SELECT COUNT(*) INTO current_count FROM public.barbers WHERE barbershop_id = NEW.barbershop_id AND is_active = true;
    SELECT max_barbers INTO max_allowed FROM public.barbershops WHERE id = NEW.barbershop_id;
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Limite de barbeiros do seu plano atingido (% de %)', current_count, max_allowed;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
    SELECT COUNT(*) INTO current_count FROM public.barbers WHERE barbershop_id = NEW.barbershop_id AND is_active = true;
    SELECT max_barbers INTO max_allowed FROM public.barbershops WHERE id = NEW.barbershop_id;
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Limite de barbeiros do seu plano atingido (% de %)', current_count, max_allowed;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_barber_limit ON public.barbers;
CREATE TRIGGER check_barber_limit BEFORE INSERT OR UPDATE ON public.barbers
FOR EACH ROW EXECUTE FUNCTION public.enforce_barber_limit();

UPDATE public.barbershops SET max_barbers = 1 WHERE plan::text = 'basic';
ALTER TABLE public.barbershops ALTER COLUMN max_barbers SET DEFAULT 1;

CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
  v_is_invite BOOLEAN;
BEGIN
  v_is_invite := COALESCE((NEW.raw_user_meta_data->>'is_barber_invite')::BOOLEAN, FALSE);
  IF v_is_invite THEN RETURN NEW; END IF;
  INSERT INTO public.barbershops (name, plan, max_barbers)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'), 'basic', 1)
  RETURNING id INTO v_barbershop_id;
  INSERT INTO public.barbers (auth_id, name, email, barbershop_id, is_active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Barbeiro'), NEW.email, v_barbershop_id, true)
  RETURNING id INTO v_barber_id;
  INSERT INTO public.user_roles (user_id, role, barbershop_id) VALUES (NEW.id, 'master', v_barbershop_id);
  INSERT INTO public.barber_permissions (barber_id, can_edit_own_schedule, can_view_others_schedule, can_edit_others_schedule)
  VALUES (v_barber_id, true, true, true);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_max_barbers_on_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.max_barbers := public.get_plan_limit(NEW.plan::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_plan_max_barbers ON public.barbershops;
CREATE TRIGGER sync_plan_max_barbers BEFORE UPDATE ON public.barbershops
FOR EACH ROW EXECUTE FUNCTION public.sync_max_barbers_on_plan_change();