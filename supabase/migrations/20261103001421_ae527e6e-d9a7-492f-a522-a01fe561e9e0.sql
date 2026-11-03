ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS business_segment text NOT NULL DEFAULT 'barbershop',
  ADD COLUMN IF NOT EXISTS owner_attends boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.validate_business_segment()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.business_segment NOT IN ('barbershop','salon','nails','aesthetics','massage','tattoo','petshop','automotive','other') THEN
    RAISE EXCEPTION 'Segmento inválido';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_business_segment BEFORE INSERT OR UPDATE ON public.barbershops
FOR EACH ROW EXECUTE FUNCTION public.validate_business_segment();

-- Taxas
CREATE TABLE public.payment_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  debit_pct numeric NOT NULL DEFAULT 0,
  credit_pct numeric NOT NULL DEFAULT 0,
  pix_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_fees TO authenticated;
GRANT ALL ON public.payment_fees TO service_role;
ALTER TABLE public.payment_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view fees" ON public.payment_fees FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Master manages fees" ON public.payment_fees FOR ALL TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE TRIGGER trg_payment_fees_updated BEFORE UPDATE ON public.payment_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planos de assinatura de clientes
CREATE TABLE public.client_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  uses_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_plans TO authenticated;
GRANT ALL ON public.client_plans TO service_role;
ALTER TABLE public.client_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view plans" ON public.client_plans FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Master manages plans" ON public.client_plans FOR ALL TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE TRIGGER trg_client_plans_updated BEFORE UPDATE ON public.client_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assinantes
CREATE TABLE public.client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.client_plans(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date NOT NULL DEFAULT (CURRENT_DATE + 30),
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_subs_phone ON public.client_subscriptions(barbershop_id, customer_phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_subscriptions TO authenticated;
GRANT ALL ON public.client_subscriptions TO service_role;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view subs" ON public.client_subscriptions FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Master manages subs" ON public.client_subscriptions FOR ALL TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE TRIGGER trg_client_subs_updated BEFORE UPDATE ON public.client_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();