
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- ---------- BARBERS ----------
-- Restrict anon column access (hide email, phone, auth_id, monthly_goal)
REVOKE SELECT ON public.barbers FROM anon;
GRANT SELECT (id, name, photo_url, is_active, barbershop_id) ON public.barbers TO anon;

-- ---------- BARBERSHOPS ----------
-- Hide subscription/plan/trial/billing fields from anon
REVOKE SELECT ON public.barbershops FROM anon;
GRANT SELECT (id, name, slug, phone, photo_url, city, google_maps_url) ON public.barbershops TO anon;

-- ---------- APPOINTMENTS ----------
-- Hide customer PII (customer_name, customer_phone, notes, payment_method, paid_at) from anon
REVOKE SELECT ON public.appointments FROM anon;
GRANT SELECT (id, barber_id, service_id, start_time, end_time, status, barbershop_id, origin, created_at, updated_at)
  ON public.appointments TO anon;

-- ---------- BLOCKED_SLOTS ----------
-- Hide 'reason' from anon
REVOKE SELECT ON public.blocked_slots FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, start_time, end_time, created_at)
  ON public.blocked_slots TO anon;

-- ---------- OPENING_HOURS ----------
-- All columns are scheduling metadata; expose explicit set only
REVOKE SELECT ON public.opening_hours FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, day_of_week, start_time, end_time, is_open, break_start, break_end)
  ON public.opening_hours TO anon;

-- ---------- BARBER_WHATSAPP ----------
-- Only masters of the barbershop OR the owning barber can view
DROP POLICY IF EXISTS "Users can view whatsapp settings from same barbershop" ON public.barber_whatsapp;
CREATE POLICY "Master or own barber can view whatsapp settings"
ON public.barber_whatsapp
FOR SELECT
TO authenticated
USING (
  public.is_barber_owner(barber_id)
  OR EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = barber_whatsapp.barber_id
      AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
  )
);

-- ============================================================
-- STORAGE: scope INSERT / UPDATE / DELETE to owner's folder
-- Paths use `${barbershop_id}/...` OR `${barber_id}/...`
-- ============================================================

-- Drop broad policies
DROP POLICY IF EXISTS "Auth users upload barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload barbershop photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update barbershop photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete barbershop photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload product photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload service photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update service photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete service photos" ON storage.objects;
DROP POLICY IF EXISTS "Masters can upload public profile assets" ON storage.objects;
DROP POLICY IF EXISTS "Masters can update public profile assets" ON storage.objects;
DROP POLICY IF EXISTS "Masters can delete public profile assets" ON storage.objects;

-- Helper: check if first folder equals caller's barbershop id
-- (inline using get_user_barbershop_id and is_barber_owner)

-- BARBER-PHOTOS (path = barber_id/...)
CREATE POLICY "Owner barber can upload barber photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'barber-photos'
  AND (
    public.is_barber_owner(((storage.foldername(name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = ((storage.foldername(name))[1])::uuid
        AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
    )
  )
);
CREATE POLICY "Owner barber can update barber photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'barber-photos'
  AND (
    public.is_barber_owner(((storage.foldername(name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = ((storage.foldername(name))[1])::uuid
        AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
    )
  )
);
CREATE POLICY "Owner barber can delete barber photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'barber-photos'
  AND (
    public.is_barber_owner(((storage.foldername(name))[1])::uuid)
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = ((storage.foldername(name))[1])::uuid
        AND public.is_master_of_barbershop(auth.uid(), b.barbershop_id)
    )
  )
);

-- BARBERSHOP-PHOTOS (path = barbershop_id/...)
CREATE POLICY "Master can upload barbershop photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'barbershop-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can update barbershop photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'barbershop-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can delete barbershop photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'barbershop-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- GALLERY-PHOTOS (path = barbershop_id/...)
CREATE POLICY "Master can upload gallery photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gallery-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can update gallery photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'gallery-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can delete gallery photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'gallery-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- PRODUCT-PHOTOS (path = barbershop_id/...)
CREATE POLICY "Master can upload product photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can update product photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can delete product photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-photos'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- SERVICE-PHOTOS (path = barbershop_id/... OR barber_id/...)
CREATE POLICY "Owner can upload service photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'service-photos'
  AND (
    public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_barber_owner(((storage.foldername(name))[1])::uuid)
  )
);
CREATE POLICY "Owner can update service photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'service-photos'
  AND (
    public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_barber_owner(((storage.foldername(name))[1])::uuid)
  )
);
CREATE POLICY "Owner can delete service photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'service-photos'
  AND (
    public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_barber_owner(((storage.foldername(name))[1])::uuid)
  )
);

-- PUBLIC-PROFILES (path = barbershop_id/...)
CREATE POLICY "Master can upload public profile assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public-profiles'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can update public profile assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'public-profiles'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Master can delete public profile assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'public-profiles'
  AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- ============================================================
-- PUBLIC BUCKET LISTING: remove broad SELECT policies
-- Files remain accessible via getPublicUrl (public buckets),
-- but listing/enumeration via API is disabled.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view public profile assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view service photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read barbershop photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read gallery photos" ON storage.objects;

-- ============================================================
-- SECURITY DEFINER FUNCTIONS: revoke public EXECUTE
-- These are called by triggers and other SQL — no client RPC.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_max_barbers_on_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_add_barber(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_barber_permissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_appointment_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.count_barbers_in_barbershop(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_barber_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_barber_view_schedule(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_barber_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.materialize_recurring_expenses(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_barber_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_barber_edit_schedule(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_barbershop() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_barber() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_master_of_barbershop(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_barbershop_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_generate_barbershop_slug() FROM PUBLIC, anon, authenticated;
