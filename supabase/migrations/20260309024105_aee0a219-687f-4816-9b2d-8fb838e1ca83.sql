
-- Create barber_service_photos table for per-barber service portfolio photos
CREATE TABLE public.barber_service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

-- Enable RLS
ALTER TABLE public.barber_service_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view (for public booking pages)
CREATE POLICY "Anyone can view barber service photos"
ON public.barber_service_photos FOR SELECT
USING (true);

-- Barbers can insert their own photos
CREATE POLICY "Barbers can insert their own service photos"
ON public.barber_service_photos FOR INSERT
TO authenticated
WITH CHECK (
  barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_service_photos.barber_id
    AND is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

-- Barbers can update their own photos
CREATE POLICY "Barbers can update their own service photos"
ON public.barber_service_photos FOR UPDATE
TO authenticated
USING (
  barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_service_photos.barber_id
    AND is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

-- Barbers can delete their own photos
CREATE POLICY "Barbers can delete their own service photos"
ON public.barber_service_photos FOR DELETE
TO authenticated
USING (
  barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_service_photos.barber_id
    AND is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);
