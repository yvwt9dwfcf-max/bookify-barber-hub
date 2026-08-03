-- APPOINTMENTS: remove broad anon SELECT, allow only availability columns for future slots
REVOKE SELECT ON public.appointments FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, service_id, start_time, end_time, status) ON public.appointments TO anon;

DROP POLICY IF EXISTS "Anon can read appointment slot data" ON public.appointments;
CREATE POLICY "Anon can read future appointment availability"
ON public.appointments
FOR SELECT
TO anon
USING (status <> 'cancelled' AND end_time >= (now() - interval '1 day'));

-- BARBERS: remove broad anon SELECT, allow only public directory columns
REVOKE SELECT ON public.barbers FROM anon;
GRANT SELECT (id, name, photo_url, barbershop_id, is_active) ON public.barbers TO anon;

DROP POLICY IF EXISTS "Anon can read active barber directory" ON public.barbers;
CREATE POLICY "Anon can read active barber directory"
ON public.barbers
FOR SELECT
TO anon
USING (is_active = true);