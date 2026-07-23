
DROP POLICY IF EXISTS "Owner barber can upload barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner barber can update barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner barber can delete barber photos" ON storage.objects;

CREATE POLICY "Owner barber can upload barber photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'barber-photos'
  AND (
    public.is_barber_owner(((storage.foldername(storage.objects.name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = ((storage.foldername(storage.objects.name))[1])::uuid
        AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
    )
  )
);

CREATE POLICY "Owner barber can update barber photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'barber-photos'
  AND (
    public.is_barber_owner(((storage.foldername(storage.objects.name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = ((storage.foldername(storage.objects.name))[1])::uuid
        AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
    )
  )
);

CREATE POLICY "Owner barber can delete barber photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'barber-photos'
  AND (
    public.is_barber_owner(((storage.foldername(storage.objects.name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = ((storage.foldername(storage.objects.name))[1])::uuid
        AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
    )
  )
);
