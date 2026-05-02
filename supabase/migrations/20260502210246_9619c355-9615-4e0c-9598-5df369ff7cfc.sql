
-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barbershop ON public.products(barbershop_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view products"
  ON public.products FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Masters can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCT SALES ============
CREATE TABLE public.product_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  product_id UUID NOT NULL,
  barber_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  notes TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_sales_barbershop ON public.product_sales(barbershop_id);
CREATE INDEX idx_product_sales_sold_at ON public.product_sales(sold_at);
CREATE INDEX idx_product_sales_barber ON public.product_sales(barber_id);
CREATE INDEX idx_product_sales_product ON public.product_sales(product_id);

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sales"
  ON public.product_sales FOR SELECT TO authenticated
  USING (barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Members can create sales"
  ON public.product_sales FOR INSERT TO authenticated
  WITH CHECK (barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Masters can update sales"
  ON public.product_sales FOR UPDATE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

CREATE POLICY "Masters can delete sales"
  ON public.product_sales FOR DELETE TO authenticated
  USING (public.is_master_of_barbershop(auth.uid(), barbershop_id));

-- ============ AUTO STOCK DECREMENT ============
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
    SET stock = GREATEST(stock - NEW.quantity, 0),
        updated_at = now()
    WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock_on_sale
  AFTER INSERT ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.decrement_product_stock();

-- ============ APPOINTMENTS: payment_method ============
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ============ BARBERSHOPS: products goal ============
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS products_monthly_goal NUMERIC;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view product photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated can upload product photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Authenticated can update product photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated can delete product photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-photos');
