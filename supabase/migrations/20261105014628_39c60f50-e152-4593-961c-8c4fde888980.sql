CREATE TABLE public.appointment_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id uuid,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_extras TO authenticated;
GRANT ALL ON public.appointment_extras TO service_role;
ALTER TABLE public.appointment_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view extras" ON public.appointment_extras FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Master manages extras" ON public.appointment_extras FOR ALL TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id)) WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Reception manages extras" ON public.appointment_extras FOR ALL TO authenticated
  USING (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id)) WITH CHECK (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barber adds own extras" ON public.appointment_extras FOR INSERT TO authenticated
  WITH CHECK (barbershop_id = public.get_user_barbershop_id(auth.uid()) AND barber_id = public.get_current_barber_id());
CREATE INDEX idx_appointment_extras_shop ON public.appointment_extras(barbershop_id, created_at);