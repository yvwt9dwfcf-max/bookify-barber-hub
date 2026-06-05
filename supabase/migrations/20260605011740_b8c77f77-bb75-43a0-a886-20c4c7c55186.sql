ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_24h boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_start_time time NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS booking_end_time time NOT NULL DEFAULT '22:00';