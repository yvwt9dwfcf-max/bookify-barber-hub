
-- 1) Add appointment_id to product_sales for "comanda" tracking
ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

CREATE INDEX IF NOT EXISTS idx_product_sales_appointment_id
  ON public.product_sales(appointment_id);

CREATE INDEX IF NOT EXISTS idx_product_sales_barber_id
  ON public.product_sales(barber_id);

CREATE INDEX IF NOT EXISTS idx_product_sales_sold_at
  ON public.product_sales(sold_at);

-- 2) Materialize recurring expenses up to current month
CREATE OR REPLACE FUNCTION public.materialize_recurring_expenses(_barbershop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Permission check: user must belong to barbershop OR be service_role context
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND barbershop_id = _barbershop_id
     )
  THEN
    RETURN 0;
  END IF;

  FOR rec IN
    SELECT id, name, amount, category, expense_date
    FROM public.expenses
    WHERE barbershop_id = _barbershop_id
      AND is_recurring = true
  LOOP
    origin_day := EXTRACT(day FROM rec.expense_date)::int;
    -- Walk month by month from the month AFTER origin to the current month
    iter_date := (date_trunc('month', rec.expense_date) + interval '1 month')::date;
    WHILE iter_date <= cur_month_start LOOP
      -- Build target date clamped to last day of that month
      candidate := LEAST(
        (iter_date + (origin_day - 1) * interval '1 day')::date,
        (date_trunc('month', iter_date) + interval '1 month - 1 day')::date
      );
      target_date := candidate;

      -- Check if a recurring copy with same name+amount already exists in that month
      SELECT 1 INTO exists_check
      FROM public.expenses
      WHERE barbershop_id = _barbershop_id
        AND name = rec.name
        AND amount = rec.amount
        AND category = rec.category
        AND date_trunc('month', expense_date) = date_trunc('month', target_date)
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

-- 3) Allow members to update their sales (was master-only); needed for comanda flow
DROP POLICY IF EXISTS "Members can update sales" ON public.product_sales;
CREATE POLICY "Members can update sales"
  ON public.product_sales
  FOR UPDATE
  TO authenticated
  USING (barbershop_id = get_user_barbershop_id(auth.uid()));
