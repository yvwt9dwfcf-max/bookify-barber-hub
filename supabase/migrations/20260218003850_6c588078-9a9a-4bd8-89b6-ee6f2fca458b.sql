
-- Create public_profiles table
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

-- Enable RLS
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Public can view profiles
CREATE POLICY "Anyone can view public profiles"
ON public.public_profiles FOR SELECT
USING (true);

-- Masters can manage their own profile
CREATE POLICY "Masters can insert their public profile"
ON public.public_profiles FOR INSERT
WITH CHECK (is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can update their public profile"
ON public.public_profiles FOR UPDATE
USING (is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can delete their public profile"
ON public.public_profiles FOR DELETE
USING (is_master_of_barbershop(auth.uid(), barbershop_id));

-- Trigger for updated_at
CREATE TRIGGER update_public_profiles_updated_at
BEFORE UPDATE ON public.public_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for public profile assets
INSERT INTO storage.buckets (id, name, public) VALUES ('public-profiles', 'public-profiles', true);

-- Storage policies
CREATE POLICY "Anyone can view public profile assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-profiles');

CREATE POLICY "Masters can upload public profile assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-profiles' AND auth.uid() IS NOT NULL);

CREATE POLICY "Masters can update public profile assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'public-profiles' AND auth.uid() IS NOT NULL);

CREATE POLICY "Masters can delete public profile assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'public-profiles' AND auth.uid() IS NOT NULL);
