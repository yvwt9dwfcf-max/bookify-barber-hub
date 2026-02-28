
-- Index for loyalty_cards lookup by phone (critical for 10k+ clients)
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_barbershop_phone 
ON public.loyalty_cards (barbershop_id, customer_phone);

-- Index for loyalty_cards sorting by points
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_barbershop_points 
ON public.loyalty_cards (barbershop_id, total_points DESC);

-- Index for loyalty_transactions duplicate check
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_appointment 
ON public.loyalty_transactions (appointment_id, type);

-- Index for loyalty_cards name search
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_name_search
ON public.loyalty_cards (barbershop_id, customer_name text_pattern_ops);

-- Allow barbers to view loyalty_config for their barbershop
CREATE POLICY "Barbers can view loyalty config" ON public.loyalty_config
FOR SELECT USING (
  barbershop_id IN (
    SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Allow barbers to view loyalty cards in their barbershop  
CREATE POLICY "Barbers can view loyalty cards" ON public.loyalty_cards
FOR SELECT USING (
  barbershop_id IN (
    SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Allow barbers to create loyalty transactions
CREATE POLICY "Barbers can create transactions" ON public.loyalty_transactions
FOR INSERT WITH CHECK (
  barbershop_id IN (
    SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Allow barbers to update loyalty cards (for redeem)
CREATE POLICY "Barbers can update cards" ON public.loyalty_cards
FOR UPDATE USING (
  barbershop_id IN (
    SELECT barbershop_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);
