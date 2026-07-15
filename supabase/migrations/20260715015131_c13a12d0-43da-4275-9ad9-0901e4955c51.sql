
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  grupo text NOT NULL DEFAULT 'Geral',
  essencial boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature flags são públicas para leitura"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam feature flags"
  ON public.feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (grupo, key, label, essencial, enabled, description) VALUES
  ('Aquisição', 'simulador', 'Simulador de orçamento', true, true, 'Simulador que mostra a estimativa do casamento e sugere fornecedores.'),
  ('Aquisição', 'explorar', 'Explorar (mapa + lista)', true, true, 'Página de busca de fornecedores com mapa e lista.'),
  ('Aquisição', 'categorias_publicas', 'Páginas de categoria (SEO)', true, true, 'Landing pages públicas de cada categoria de fornecedor.'),
  ('Aquisição', 'datas_ociosas', 'Datas ociosas / descontos', false, true, 'Sinalização de datas com desconto oferecidas pelos fornecedores.'),
  ('Casal', 'painel_casal', 'Painel do casal (tarefas/orçamento/convidados)', true, true, 'Dashboard com tarefas, orçamento, convidados e fornecedores.'),
  ('Casal', 'pedido_orcamento', 'Pedido de orçamento + negociação', true, true, 'Fluxo de pedido de orçamento com chat e propostas.'),
  ('Casal', 'rsvp_convidados', 'Lista de convidados + RSVP', false, true, 'Gestão de convidados e confirmação de presença.'),
  ('Fornecedor', 'painel_fornecedor', 'Painel do fornecedor', true, true, 'Área do fornecedor com pedidos, agenda e métricas.'),
  ('Fornecedor', 'avaliacao_casal_fornecedor', 'Avaliação casal→fornecedor', false, true, 'Casais podem avaliar fornecedores contratados.'),
  ('Social', 'casais_feed', 'Feed social de casais', false, false, 'Feed público com perfis de casais.'),
  ('Social', 'perfil_social_casal', 'Perfil público do casal', false, false, 'Página pública com fotos e história do casal.'),
  ('Social', 'mensagens_casais', 'Mensagens entre casais', false, false, 'Troca de mensagens entre casais e com fornecedores via perfil.'),
  ('Social', 'indicacoes', 'Programa de indicações', false, false, 'Sistema de indicações com benefícios.'),
  ('Social', 'avaliacao_bidirecional', 'Avaliação fornecedor→casal', false, false, 'Fornecedores também avaliam casais.')
ON CONFLICT (key) DO NOTHING;
