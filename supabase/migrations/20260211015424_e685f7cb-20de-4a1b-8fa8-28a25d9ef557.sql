
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, couple_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews of approved suppliers
CREATE POLICY "Reviews are publicly readable"
  ON public.reviews FOR SELECT
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved')
    OR user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- Couples can insert their own reviews
CREATE POLICY "Couples can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND couple_id = get_couple_id_for_user(auth.uid())
  );

-- Couples can update their own reviews
CREATE POLICY "Couples can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Couples can delete their own reviews
CREATE POLICY "Couples can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update supplier rating/review_count
CREATE OR REPLACE FUNCTION public.update_supplier_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier_id UUID;
BEGIN
  _supplier_id := COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  UPDATE public.suppliers
  SET 
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE supplier_id = _supplier_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE supplier_id = _supplier_id)
  WHERE id = _supplier_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_supplier_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_supplier_rating();
