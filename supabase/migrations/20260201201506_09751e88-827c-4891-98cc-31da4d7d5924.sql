-- Add break interval columns to opening_hours
ALTER TABLE public.opening_hours
ADD COLUMN break_start time without time zone DEFAULT NULL,
ADD COLUMN break_end time without time zone DEFAULT NULL;