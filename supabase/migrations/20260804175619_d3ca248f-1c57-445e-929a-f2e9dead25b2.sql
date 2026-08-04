
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  preco_mensal numeric NOT NULL DEFAULT 0,
  preco_anual numeric NOT NULL DEFAULT 0,
  beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  destaque_busca boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planos ativos são públicos" ON public.subscription_plans
  FOR SELECT USING (ativo = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia planos" ON public.subscription_plans
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.supplier_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  ciclo text NOT NULL DEFAULT 'mensal',
  status text NOT NULL DEFAULT 'pendente',
  valor numeric NOT NULL DEFAULT 0,
  mp_preapproval_id text,
  ambiente text NOT NULL DEFAULT 'sandbox',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX supplier_subscriptions_ativa_idx ON public.supplier_subscriptions (supplier_id)
  WHERE status IN ('ativa','pendente');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_subscriptions TO authenticated;
GRANT ALL ON public.supplier_subscriptions TO service_role;
ALTER TABLE public.supplier_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedor vê a própria assinatura" ON public.supplier_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Fornecedor cria a própria assinatura" ON public.supplier_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));
CREATE POLICY "Fornecedor atualiza a própria assinatura" ON public.supplier_subscriptions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admin remove assinaturas" ON public.supplier_subscriptions
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.supplier_subscriptions(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  mp_payment_id text,
  ambiente text NOT NULL DEFAULT 'sandbox',
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_invoices TO authenticated;
GRANT ALL ON public.subscription_invoices TO service_role;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedor vê as próprias cobranças" ON public.subscription_invoices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'));

CREATE TABLE public.featured_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  dias integer NOT NULL DEFAULT 7,
  escopo_categoria_id uuid,
  escopo_cidade text,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  mp_payment_id text,
  ambiente text NOT NULL DEFAULT 'sandbox',
  inicio timestamptz,
  fim timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.featured_purchases TO authenticated;
GRANT ALL ON public.featured_purchases TO service_role;
ALTER TABLE public.featured_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedor vê os próprios destaques" ON public.featured_purchases
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Fornecedor compra destaque" ON public.featured_purchases
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));
CREATE POLICY "Fornecedor ou admin atualiza destaque" ON public.featured_purchases
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR has_role(auth.uid(),'admin'));

CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  referencia_id uuid,
  user_id uuid,
  supplier_id uuid,
  couple_id uuid,
  valor numeric NOT NULL DEFAULT 0,
  comissao numeric NOT NULL DEFAULT 0,
  metodo text,
  status text NOT NULL DEFAULT 'pendente',
  mp_payment_id text,
  ambiente text NOT NULL DEFAULT 'sandbox',
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê os próprios pagamentos" ON public.payment_intents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE TRIGGER trg_subscription_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_supplier_subscriptions_updated BEFORE UPDATE ON public.supplier_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subscription_invoices_updated BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_featured_purchases_updated BEFORE UPDATE ON public.featured_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_intents_updated BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.expirar_monetizacao()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.featured_purchases SET status = 'expirado'
    WHERE status = 'ativo' AND fim IS NOT NULL AND fim < now();
  UPDATE public.suppliers SET featured = false, featured_until = NULL
    WHERE featured_until IS NOT NULL AND featured_until < now();
  UPDATE public.supplier_subscriptions SET status = 'expirada'
    WHERE status = 'ativa' AND current_period_end IS NOT NULL AND current_period_end < now() - interval '3 days';
END;
$$;

INSERT INTO public.feature_flags (key, enabled, label, grupo, essencial, description) VALUES
  ('assinatura_fornecedor', false, 'Assinatura do fornecedor', 'Fornecedor', false, 'Planos pagos com cobrança recorrente para fornecedores.'),
  ('destaque_pago', false, 'Destaque pago', 'Fornecedor', false, 'Compra de destaque na busca por período.'),
  ('checkout_transparente', false, 'Checkout transparente', 'Pagamentos', false, 'Pagamento dentro do site via Mercado Pago Bricks.')
ON CONFLICT (key) DO NOTHING;

UPDATE public.feature_flags SET enabled = true WHERE key IN ('reserva_datas_ociosas','corretagem_datas_ociosas');

INSERT INTO public.subscription_plans (slug, nome, descricao, preco_mensal, preco_anual, beneficios, limites, destaque_busca, ordem) VALUES
  ('essencial','Essencial','Para começar a receber pedidos de orçamento.',0,0,
    '["Perfil público","Pedidos de orçamento","Agenda de datas"]'::jsonb,
    '{"orcamentos_mes":10,"crm":false,"vagas":false}'::jsonb, false, 1),
  ('pro','Pro','Mais visibilidade e ferramentas de gestão.',97,970,
    '["Tudo do Essencial","CRM de leads","Relatórios","Selo Pro no perfil"]'::jsonb,
    '{"orcamentos_mes":100,"crm":true,"vagas":false}'::jsonb, false, 2),
  ('premium','Premium','Destaque permanente na busca e módulo de equipe.',197,1970,
    '["Tudo do Pro","Destaque na busca","Equipe e vagas","Prioridade no atendimento"]'::jsonb,
    '{"orcamentos_mes":null,"crm":true,"vagas":true}'::jsonb, true, 3)
ON CONFLICT (slug) DO NOTHING;
