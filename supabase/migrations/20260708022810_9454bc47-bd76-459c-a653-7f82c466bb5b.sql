
-- =========================================================
-- 1. APPOINTMENTS: remove public SELECT, add authenticated
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view appointments for availability check" ON public.appointments;

CREATE POLICY "Authenticated staff can view barbershop appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    barbershop_id = public.get_user_barbershop_id(auth.uid())
    OR public.is_master_of_barbershop(auth.uid(), barbershop_id)
    OR barber_id IN (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  );

-- Public availability view: only slot info, no customer PII
CREATE OR REPLACE VIEW public.appointments_public AS
  SELECT id, barber_id, barbershop_id, service_id, start_time, end_time, status
  FROM public.appointments
  WHERE status <> 'cancelled';

GRANT SELECT ON public.appointments_public TO anon, authenticated;

-- =========================================================
-- 2. BARBERS: remove anon-exposing SELECT, add safe view
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view active barbers for public booking" ON public.barbers;

-- Public directory: only booking-relevant fields
CREATE OR REPLACE VIEW public.barbers_public AS
  SELECT id, name, photo_url, is_active, barbershop_id
  FROM public.barbers
  WHERE is_active = true;

GRANT SELECT ON public.barbers_public TO anon, authenticated;

-- =========================================================
-- 3. LOYALTY_CONFIG: consolidate duplicate SELECT policies
-- =========================================================
DROP POLICY IF EXISTS "Barbers can view loyalty config" ON public.loyalty_config;
DROP POLICY IF EXISTS "Barbershop members can view loyalty config" ON public.loyalty_config;

CREATE POLICY "Barbershop members can view loyalty config"
  ON public.loyalty_config FOR SELECT TO authenticated
  USING (
    barbershop_id IN (
      SELECT user_roles.barbershop_id FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );

-- =========================================================
-- 4. LOYALTY_CARDS: consolidate duplicate policies
-- =========================================================
DROP POLICY IF EXISTS "Barbers can view loyalty cards" ON public.loyalty_cards;
DROP POLICY IF EXISTS "Barbershop members can view cards" ON public.loyalty_cards;
DROP POLICY IF EXISTS "Barbers can update cards" ON public.loyalty_cards;
DROP POLICY IF EXISTS "Barbershop members can update cards" ON public.loyalty_cards;

CREATE POLICY "Barbershop members can view cards"
  ON public.loyalty_cards FOR SELECT TO authenticated
  USING (
    barbershop_id IN (
      SELECT user_roles.barbershop_id FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbershop members can update cards"
  ON public.loyalty_cards FOR UPDATE TO authenticated
  USING (
    barbershop_id IN (
      SELECT user_roles.barbershop_id FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );
