-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

-- Create a new INSERT policy with permission checks
-- Allows public (unauthenticated) booking AND authenticated users with proper permissions
CREATE POLICY "Users can create appointments with permission check"
ON public.appointments
FOR INSERT
WITH CHECK (
  -- Public booking (unauthenticated users via booking link) is allowed
  auth.uid() IS NULL
  OR
  -- Authenticated users must have permission to create for this barber
  can_barber_edit_schedule(auth.uid(), barber_id)
);