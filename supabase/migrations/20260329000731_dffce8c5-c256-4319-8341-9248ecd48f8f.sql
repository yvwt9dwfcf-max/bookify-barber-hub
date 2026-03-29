
-- 1. Expenses table for cost tracking
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'outros',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (is_master_of_barbershop(auth.uid(), barbershop_id))
  WITH CHECK (is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Barbershop members can view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (barbershop_id = get_user_barbershop_id(auth.uid()));

-- 2. Barber individual monthly goal
ALTER TABLE public.barbers ADD COLUMN monthly_goal numeric DEFAULT NULL;

-- 3. Theme color for public page customization
ALTER TABLE public.public_profiles ADD COLUMN theme_color text DEFAULT NULL;
