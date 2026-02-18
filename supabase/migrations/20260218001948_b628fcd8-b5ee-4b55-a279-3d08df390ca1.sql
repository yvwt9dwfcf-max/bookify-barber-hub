
-- Add photo_url and location fields to barbershops
ALTER TABLE public.barbershops 
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Add photo_url to barbers
ALTER TABLE public.barbers 
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Create gallery table
CREATE TABLE IF NOT EXISTS public.barbershop_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.barbershop_gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can view gallery (public page)
CREATE POLICY "Anyone can view gallery" ON public.barbershop_gallery
  FOR SELECT USING (true);

-- Masters can manage gallery
CREATE POLICY "Masters can manage gallery" ON public.barbershop_gallery
  FOR ALL USING (is_master_of_barbershop(auth.uid(), barbershop_id));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('barbershop-photos', 'barbershop-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - barbershop photos
CREATE POLICY "Public read barbershop photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'barbershop-photos');

CREATE POLICY "Auth users upload barbershop photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'barbershop-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users update barbershop photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'barbershop-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users delete barbershop photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'barbershop-photos' AND auth.uid() IS NOT NULL);

-- Storage policies - barber photos
CREATE POLICY "Public read barber photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'barber-photos');

CREATE POLICY "Auth users upload barber photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'barber-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users update barber photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'barber-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users delete barber photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'barber-photos' AND auth.uid() IS NOT NULL);

-- Storage policies - gallery photos
CREATE POLICY "Public read gallery photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery-photos');

CREATE POLICY "Auth users upload gallery photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gallery-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users update gallery photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'gallery-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users delete gallery photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'gallery-photos' AND auth.uid() IS NOT NULL);
