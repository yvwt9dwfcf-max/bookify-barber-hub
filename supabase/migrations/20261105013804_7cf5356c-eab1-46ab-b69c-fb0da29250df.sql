CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master manages sub payments" ON public.subscription_payments FOR ALL TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id)) WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Reception manages sub payments" ON public.subscription_payments FOR ALL TO authenticated
  USING (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id)) WITH CHECK (public.is_receptionist_of_barbershop(auth.uid(), barbershop_id));
CREATE INDEX idx_sub_payments_shop_paid ON public.subscription_payments(barbershop_id, paid_at);