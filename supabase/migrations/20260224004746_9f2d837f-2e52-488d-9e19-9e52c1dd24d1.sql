
-- =============================================
-- 1. AVALIAÇÕES DE CLIENTES (reviews)
-- =============================================
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can create a review (public booking flow)
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT WITH CHECK (true);
-- Barbershop members can view their reviews
CREATE POLICY "Barbershop members can view reviews" ON public.reviews FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
  OR true -- reviews are public
);
-- Masters can delete reviews
CREATE POLICY "Masters can delete reviews" ON public.reviews FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = reviews.barbershop_id AND role = 'master')
);

-- =============================================
-- 2. GESTÃO DE COMISSÕES (barber_commissions)
-- =============================================
CREATE TABLE public.barber_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  default_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id)
);

-- Per-service override
CREATE TABLE public.commission_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

ALTER TABLE public.barber_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop members can view commissions" ON public.barber_commissions FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Masters can manage commissions" ON public.barber_commissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = barber_commissions.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can update commissions" ON public.barber_commissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = barber_commissions.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can delete commissions" ON public.barber_commissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = barber_commissions.barbershop_id AND role = 'master')
);

CREATE POLICY "Barbershop members can view overrides" ON public.commission_overrides FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Masters can manage overrides" ON public.commission_overrides FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = commission_overrides.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can update overrides" ON public.commission_overrides FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = commission_overrides.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can delete overrides" ON public.commission_overrides FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = commission_overrides.barbershop_id AND role = 'master')
);

-- =============================================
-- 3. PROGRAMA DE FIDELIDADE
-- =============================================
CREATE TABLE public.loyalty_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
  points_per_visit INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Loyalty config policies
CREATE POLICY "Barbershop members can view loyalty config" ON public.loyalty_config FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Masters can manage loyalty config" ON public.loyalty_config FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_config.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can update loyalty config" ON public.loyalty_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_config.barbershop_id AND role = 'master')
);

-- Loyalty rewards policies
CREATE POLICY "Barbershop members can view rewards" ON public.loyalty_rewards FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Masters can manage rewards" ON public.loyalty_rewards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_rewards.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can update rewards" ON public.loyalty_rewards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_rewards.barbershop_id AND role = 'master')
);
CREATE POLICY "Masters can delete rewards" ON public.loyalty_rewards FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND barbershop_id = loyalty_rewards.barbershop_id AND role = 'master')
);

-- Loyalty cards policies
CREATE POLICY "Barbershop members can view cards" ON public.loyalty_cards FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Barbershop members can manage cards" ON public.loyalty_cards FOR INSERT WITH CHECK (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Barbershop members can update cards" ON public.loyalty_cards FOR UPDATE USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);

-- Loyalty transactions policies
CREATE POLICY "Barbershop members can view transactions" ON public.loyalty_transactions FOR SELECT USING (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Barbershop members can create transactions" ON public.loyalty_transactions FOR INSERT WITH CHECK (
  barbershop_id IN (SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid())
);
