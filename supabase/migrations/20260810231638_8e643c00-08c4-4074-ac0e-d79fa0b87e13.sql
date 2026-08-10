-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_barbershop ON public.products(barbershop_id);

CREATE POLICY "Members can view products" ON public.products FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Masters can insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can update products" ON public.products FOR UPDATE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Masters can delete products" ON public.products FOR DELETE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCT SALES ============
CREATE TABLE public.product_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  product_id UUID NOT NULL,
  barber_id UUID,
  appointment_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  notes TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sales TO authenticated;
GRANT ALL ON public.product_sales TO service_role;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_sales_barbershop ON public.product_sales(barbershop_id);
CREATE INDEX idx_product_sales_sold_at ON public.product_sales(sold_at);
CREATE INDEX idx_product_sales_barber ON public.product_sales(barber_id);
CREATE INDEX idx_product_sales_product ON public.product_sales(product_id);
CREATE INDEX idx_product_sales_appointment_id ON public.product_sales(appointment_id);

CREATE POLICY "Members can view sales" ON public.product_sales FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Members can create sales" ON public.product_sales FOR INSERT TO authenticated
  WITH CHECK (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Members can update sales" ON public.product_sales FOR UPDATE TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));
CREATE POLICY "Masters can delete sales" ON public.product_sales FOR DELETE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products SET stock = GREATEST(stock - NEW.quantity, 0), updated_at = now()
    WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_decrement_stock_on_sale AFTER INSERT ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.decrement_product_stock();

-- ============ APPOINTMENTS extras ============
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS products_monthly_goal NUMERIC;

-- ============ RECURRING EXPENSES ============
CREATE OR REPLACE FUNCTION public.materialize_recurring_expenses(_barbershop_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rec RECORD;
  cur_month_start date := date_trunc('month', CURRENT_DATE)::date;
  iter_date date;
  target_date date;
  inserted_count integer := 0;
  exists_check integer;
  origin_day integer;
  candidate date;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = _barbershop_id)
  THEN RETURN 0; END IF;

  FOR rec IN
    SELECT id, name, amount, category, expense_date FROM public.expenses
    WHERE barbershop_id = _barbershop_id AND is_recurring = true
  LOOP
    origin_day := EXTRACT(day FROM rec.expense_date)::int;
    iter_date := (date_trunc('month', rec.expense_date) + interval '1 month')::date;
    WHILE iter_date <= cur_month_start LOOP
      candidate := LEAST((iter_date + (origin_day - 1) * interval '1 day')::date,
        (date_trunc('month', iter_date) + interval '1 month - 1 day')::date);
      target_date := candidate;
      SELECT 1 INTO exists_check FROM public.expenses
      WHERE barbershop_id = _barbershop_id AND name = rec.name AND amount = rec.amount
        AND category = rec.category AND date_trunc('month', expense_date) = date_trunc('month', target_date)
      LIMIT 1;
      IF exists_check IS NULL THEN
        INSERT INTO public.expenses (barbershop_id, name, amount, category, expense_date, is_recurring)
        VALUES (_barbershop_id, rec.name, rec.amount, rec.category, target_date, false);
        inserted_count := inserted_count + 1;
      END IF;
      exists_check := NULL;
      iter_date := (iter_date + interval '1 month')::date;
    END LOOP;
  END LOOP;
  RETURN inserted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.materialize_recurring_expenses(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_recurring_expenses(uuid) TO authenticated, service_role;

-- ============ SUBSCRIPTION HELPER ============
CREATE OR REPLACE FUNCTION public.is_subscription_active(_barbershop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT subscription_active OR subscription_status = 'active'
       OR (subscription_status = 'trial' AND trial_ends_at > now())
     FROM public.barbershops WHERE id = _barbershop_id), false)
$$;
REVOKE ALL ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO authenticated, service_role;

-- ============ REALTIME ============
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.product_sales REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='product_sales') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_sales;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='appointments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='barbers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.barbers;
  END IF;
END $$;

-- ============ PUBLIC PROFILE BOOKING ============
ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_24h boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_start_time time NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS booking_end_time time NOT NULL DEFAULT '22:00';

-- ============ ANON COLUMN-LEVEL GRANTS ============
REVOKE SELECT ON public.appointments FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, service_id, start_time, end_time, status) ON public.appointments TO anon;
DROP POLICY IF EXISTS "Anon can read future appointment availability" ON public.appointments;
CREATE POLICY "Anon can read future appointment availability" ON public.appointments FOR SELECT TO anon
  USING (status <> 'cancelled' AND end_time >= (now() - interval '1 day'));

REVOKE SELECT ON public.barbers FROM anon;
GRANT SELECT (id, name, photo_url, barbershop_id, is_active) ON public.barbers TO anon;
DROP POLICY IF EXISTS "Anon can read active barber directory" ON public.barbers;
CREATE POLICY "Anon can read active barber directory" ON public.barbers FOR SELECT TO anon USING (is_active = true);

REVOKE SELECT ON public.barbershops FROM anon;
GRANT SELECT (id, name, slug, phone, photo_url, city, google_maps_url) ON public.barbershops TO anon;

REVOKE SELECT ON public.blocked_slots FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, start_time, end_time, created_at) ON public.blocked_slots TO anon;
DROP POLICY IF EXISTS "Public can view upcoming blocked slots" ON public.blocked_slots;
CREATE POLICY "Public can view upcoming blocked slots" ON public.blocked_slots FOR SELECT TO anon
  USING (end_time >= (now() - interval '1 day'));

REVOKE SELECT ON public.opening_hours FROM anon;
GRANT SELECT (id, barber_id, barbershop_id, day_of_week, start_time, end_time, is_open, break_start, break_end) ON public.opening_hours TO anon;

-- ============ PUBLIC VIEWS ============
CREATE OR REPLACE VIEW public.appointments_public AS
  SELECT id, barber_id, barbershop_id, service_id, start_time, end_time, status
  FROM public.appointments WHERE status <> 'cancelled';
ALTER VIEW public.appointments_public SET (security_invoker = on);
GRANT SELECT ON public.appointments_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.barbers_public AS
  SELECT id, name, photo_url, is_active, barbershop_id
  FROM public.barbers WHERE is_active = true;
ALTER VIEW public.barbers_public SET (security_invoker = on);
GRANT SELECT ON public.barbers_public TO anon, authenticated;

-- ============ STORAGE: product photos ============
CREATE POLICY "Master can upload product photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos' AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(storage.objects.name))[1])::uuid));
CREATE POLICY "Master can update product photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-photos' AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(storage.objects.name))[1])::uuid));
CREATE POLICY "Master can delete product photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-photos' AND public.is_master_of_barbershop(auth.uid(), ((storage.foldername(storage.objects.name))[1])::uuid));
CREATE POLICY "Public can view product photos" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON public.appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_start ON public.appointments(barber_id, start_time);
CREATE INDEX IF NOT EXISTS idx_barber_commissions_barbershop_id ON public.barber_commissions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_service_photos_service_id ON public.barber_service_photos(service_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON public.barber_services(service_id);
CREATE INDEX IF NOT EXISTS idx_expenses_barbershop_date ON public.expenses(barbershop_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_opening_hours_barber_id ON public.opening_hours(barber_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_barber_id ON public.blocked_slots(barber_id);