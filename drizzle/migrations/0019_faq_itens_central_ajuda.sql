CREATE TABLE public.faq_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publico text NOT NULL DEFAULT 'todos' CHECK (publico IN ('casal','fornecedor','profissional','todos')),
  categoria text NOT NULL,
  pergunta text NOT NULL,
  slug text NOT NULL UNIQUE,
  resposta text NOT NULL,
  feature_flag text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faq_itens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_itens TO authenticated;
GRANT ALL ON public.faq_itens TO service_role;
ALTER TABLE public.faq_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq publico le ativos" ON public.faq_itens FOR SELECT TO anon, authenticated
  USING (ativo OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "faq admin insere" ON public.faq_itens FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "faq admin edita" ON public.faq_itens FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "faq admin remove" ON public.faq_itens FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX faq_itens_publico_ordem ON public.faq_itens (publico, ordem);
CREATE TRIGGER faq_itens_updated BEFORE UPDATE ON public.faq_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER zz_audit_row AFTER INSERT OR UPDATE OR DELETE ON public.faq_itens
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();