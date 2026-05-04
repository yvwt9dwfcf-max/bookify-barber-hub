-- Ensure full row data is sent on UPDATE/DELETE for realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.product_sales REPLICA IDENTITY FULL;

-- Add product_sales to the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_sales;
  END IF;
END $$;