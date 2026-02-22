
-- Add is_global flag to services table
ALTER TABLE public.services ADD COLUMN is_global boolean NOT NULL DEFAULT true;

-- Update existing services: if a service has barber_services associations for all barbers in the shop, mark as global
-- Otherwise keep default (true = global, available to all)
