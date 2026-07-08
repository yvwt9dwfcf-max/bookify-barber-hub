
-- Set security_invoker on views so RLS runs as the querying user
ALTER VIEW public.appointments_public SET (security_invoker = on);
ALTER VIEW public.barbers_public SET (security_invoker = on);

-- Column-level grants for anon on appointments (safe fields only)
REVOKE SELECT ON public.appointments FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, service_id, start_time, end_time, status)
  ON public.appointments TO anon;

-- RLS policy for anon: allow reading (columns are already restricted by GRANT)
CREATE POLICY "Anon can read appointment slot data"
  ON public.appointments FOR SELECT TO anon
  USING (true);

-- Column-level grants for anon on barbers (public directory fields only)
REVOKE SELECT ON public.barbers FROM anon;
GRANT SELECT (id, name, photo_url, is_active, barbershop_id)
  ON public.barbers TO anon;

-- RLS policy for anon reading active barbers
CREATE POLICY "Anon can read active barber directory"
  ON public.barbers FOR SELECT TO anon
  USING (is_active = true);
