
-- Drop RLS policies on reviews
DROP POLICY IF EXISTS "Anyone can view reviews for a barbershop" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Masters can delete reviews" ON public.reviews;

-- Drop the reviews table
DROP TABLE IF EXISTS public.reviews;
