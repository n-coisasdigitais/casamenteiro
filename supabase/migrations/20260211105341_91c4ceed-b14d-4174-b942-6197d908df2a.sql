
-- Create supplier_blocked_dates table
CREATE TABLE public.supplier_blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one entry per supplier per date
ALTER TABLE public.supplier_blocked_dates ADD CONSTRAINT unique_supplier_blocked_date UNIQUE (supplier_id, blocked_date);

-- Enable RLS
ALTER TABLE public.supplier_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Public can view blocked dates of approved suppliers
CREATE POLICY "Blocked dates of approved suppliers are public"
ON public.supplier_blocked_dates
FOR SELECT
USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved')
  OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Supplier owner can insert blocked dates
CREATE POLICY "Supplier can insert blocked dates"
ON public.supplier_blocked_dates
FOR INSERT
WITH CHECK (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
);

-- Supplier owner can delete blocked dates
CREATE POLICY "Supplier can delete blocked dates"
ON public.supplier_blocked_dates
FOR DELETE
USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
);

-- Index for fast lookups
CREATE INDEX idx_supplier_blocked_dates_supplier ON public.supplier_blocked_dates(supplier_id, blocked_date);
