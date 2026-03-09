
-- Add photo_url column to services table
ALTER TABLE public.services ADD COLUMN photo_url text;

-- Create storage bucket for service photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view service photos
CREATE POLICY "Anyone can view service photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');

-- Allow authenticated users to upload service photos
CREATE POLICY "Authenticated users can upload service photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-photos');

-- Allow authenticated users to update their service photos
CREATE POLICY "Authenticated users can update service photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-photos');

-- Allow authenticated users to delete service photos
CREATE POLICY "Authenticated users can delete service photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-photos');
