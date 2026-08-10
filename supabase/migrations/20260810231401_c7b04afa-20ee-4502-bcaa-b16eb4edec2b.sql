CREATE TABLE public.barber_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  default_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_commissions TO authenticated;
GRANT ALL ON public.barber_commissions TO service_role;
ALTER TABLE public.barber_commissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.commission_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_overrides TO authenticated;
GRANT ALL ON public.commission_overrides TO service_role;
ALTER TABLE public.commission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop members can view commissions" ON public.barber_commissions FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Masters can manage commissions" ON public.barber_commissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = barber_commissions.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can update commissions" ON public.barber_commissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = barber_commissions.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can delete commissions" ON public.barber_commissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = barber_commissions.barbershop_id AND role = 'master'));

CREATE POLICY "Barbershop members can view overrides" ON public.commission_overrides FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Masters can manage overrides" ON public.commission_overrides FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = commission_overrides.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can update overrides" ON public.commission_overrides FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = commission_overrides.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can delete overrides" ON public.commission_overrides FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = commission_overrides.barbershop_id AND role = 'master'));

CREATE TABLE public.loyalty_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
  points_per_visit INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  goal_points integer NOT NULL DEFAULT 10,
  reward_name text NOT NULL DEFAULT 'Corte grátis',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_config TO authenticated;
GRANT ALL ON public.loyalty_config TO service_role;
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_rewards TO authenticated;
GRANT ALL ON public.loyalty_rewards TO service_role;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.loyalty_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id, customer_phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_cards TO authenticated;
GRANT ALL ON public.loyalty_cards TO service_role;
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loyalty_card_id UUID NOT NULL REFERENCES public.loyalty_cards(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,
  description TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop members can view loyalty config" ON public.loyalty_config FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Masters can manage loyalty config" ON public.loyalty_config FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_config.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can update loyalty config" ON public.loyalty_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_config.barbershop_id AND role = 'master'));

CREATE POLICY "Barbershop members can view rewards" ON public.loyalty_rewards FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Masters can manage rewards" ON public.loyalty_rewards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_rewards.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can update rewards" ON public.loyalty_rewards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_rewards.barbershop_id AND role = 'master'));
CREATE POLICY "Masters can delete rewards" ON public.loyalty_rewards FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_rewards.barbershop_id AND role = 'master'));

CREATE POLICY "Barbershop members can view cards" ON public.loyalty_cards FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Barbershop members can manage cards" ON public.loyalty_cards FOR INSERT WITH CHECK (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Barbershop members can update cards" ON public.loyalty_cards FOR UPDATE USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Barbershop members can view transactions" ON public.loyalty_transactions FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Barbershop members can create transactions" ON public.loyalty_transactions FOR INSERT WITH CHECK (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_barbershop_phone ON public.loyalty_cards (barbershop_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_barbershop_points ON public.loyalty_cards (barbershop_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_appointment ON public.loyalty_transactions (appointment_id, type);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_name_search ON public.loyalty_cards (barbershop_id, customer_name text_pattern_ops);

ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS subscription_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.barbershops ADD COLUMN subscription_status text NOT NULL DEFAULT 'trial';

CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_barbershop_id UUID;
  v_barber_id UUID;
  v_is_invite BOOLEAN;
  v_selected_plan text;
  v_max_barbers integer;
BEGIN
  v_is_invite := COALESCE((NEW.raw_user_meta_data->>'is_barber_invite')::BOOLEAN, FALSE);
  IF v_is_invite THEN RETURN NEW; END IF;
  v_selected_plan := 'pro';
  v_max_barbers := public.get_plan_limit(v_selected_plan);
  INSERT INTO public.barbershops (name, plan, max_barbers, subscription_status, trial_ends_at)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'), v_selected_plan::plan_type, v_max_barbers, 'trial', now() + interval '72 hours')
  RETURNING id INTO v_barbershop_id;
  INSERT INTO public.barbers (auth_id, name, email, barbershop_id, is_active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Barbeiro'), NEW.email, v_barbershop_id, true)
  RETURNING id INTO v_barber_id;
  INSERT INTO public.user_roles (user_id, role, barbershop_id) VALUES (NEW.id, 'master', v_barbershop_id);
  INSERT INTO public.barber_permissions (barber_id, can_edit_own_schedule, can_view_others_schedule, can_edit_others_schedule)
  VALUES (v_barber_id, true, true, true);
  RETURN NEW;
END;
$function$;

ALTER TABLE public.services ADD COLUMN photo_url text;

CREATE POLICY "Anyone can view service photos" ON storage.objects FOR SELECT USING (bucket_id = 'service-photos');
CREATE POLICY "Authenticated users can upload service photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-photos');
CREATE POLICY "Authenticated users can update service photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-photos');
CREATE POLICY "Authenticated users can delete service photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-photos');

CREATE TABLE public.barber_service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);
GRANT SELECT ON public.barber_service_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_service_photos TO authenticated;
GRANT ALL ON public.barber_service_photos TO service_role;
ALTER TABLE public.barber_service_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view barber service photos" ON public.barber_service_photos FOR SELECT USING (true);
CREATE POLICY "Barbers can insert their own service photos" ON public.barber_service_photos FOR INSERT TO authenticated
WITH CHECK (barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_service_photos.barber_id AND is_master_of_barbershop(auth.uid(), b.barbershop_id)));
CREATE POLICY "Barbers can update their own service photos" ON public.barber_service_photos FOR UPDATE TO authenticated
USING (barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_service_photos.barber_id AND is_master_of_barbershop(auth.uid(), b.barbershop_id)));
CREATE POLICY "Barbers can delete their own service photos" ON public.barber_service_photos FOR DELETE TO authenticated
USING (barber_id = (SELECT id FROM public.barbers WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_service_photos.barber_id AND is_master_of_barbershop(auth.uid(), b.barbershop_id)));

ALTER TABLE public.barbershops ADD COLUMN tutorial_completed boolean NOT NULL DEFAULT false;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters can manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (is_master_of_barbershop(auth.uid(), barbershop_id)) WITH CHECK (is_master_of_barbershop(auth.uid(), barbershop_id));
CREATE POLICY "Barbershop members can view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (barbershop_id = get_user_barbershop_id(auth.uid()));

ALTER TABLE public.barbers ADD COLUMN monthly_goal numeric DEFAULT NULL;
ALTER TABLE public.public_profiles ADD COLUMN theme_color text DEFAULT NULL;