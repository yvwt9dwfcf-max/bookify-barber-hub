
-- Add goal_points to loyalty_config for simple reward threshold
ALTER TABLE public.loyalty_config ADD COLUMN IF NOT EXISTS goal_points integer NOT NULL DEFAULT 10;
