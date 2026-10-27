CREATE TABLE IF NOT EXISTS public.supplier_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  pergunta text NOT NULL CHECK (length(trim(pergunta)) BETWEEN 5 AND 200),
  resposta text NOT NULL CHECK (length(trim(resposta)) BETWEEN 2 AND 1500),
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_faqs_supplier ON public.supplier_faqs(supplier_id, ordem);
GRANT SELECT ON public.supplier_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_faqs TO authenticated;
GRANT ALL ON public.supplier_faqs TO service_role;
ALTER TABLE public.supplier_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem perguntas de aprovados" ON public.supplier_faqs
  FOR SELECT USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved')
    OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Dono e admin editam perguntas" ON public.supplier_faqs
  FOR ALL TO authenticated
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Couples can create reviews" ON public.reviews;
CREATE POLICY "Couples can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND couple_id = get_couple_id_for_user(auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.quotes q WHERE q.couple_id = reviews.couple_id AND q.supplier_id = reviews.supplier_id)
      OR EXISTS (SELECT 1 FROM public.couple_suppliers cs WHERE cs.couple_id = reviews.couple_id AND cs.supplier_id = reviews.supplier_id
                 AND (cs.status = 'contracted' OR cs.kanban_status = 'contratado'))
    )
  );

CREATE OR REPLACE FUNCTION public.fornecedor_tempo_resposta(_supplier_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH respostas AS (
    SELECT EXTRACT(EPOCH FROM (min(m.created_at) - q.created_at)) / 3600.0 AS horas
    FROM public.quotes q
    JOIN public.suppliers s ON s.id = q.supplier_id
    JOIN public.quote_messages m ON m.quote_id = q.id AND m.sender_id = s.user_id
    WHERE q.supplier_id = _supplier_id AND q.created_at > now() - interval '180 days'
    GROUP BY q.id, q.created_at
  )
  SELECT CASE WHEN count(*) >= 3 THEN round(percentile_cont(0.5) WITHIN GROUP (ORDER BY horas)::numeric, 1) END
  FROM respostas;
$$;
GRANT EXECUTE ON FUNCTION public.fornecedor_tempo_resposta(uuid) TO anon, authenticated, service_role;