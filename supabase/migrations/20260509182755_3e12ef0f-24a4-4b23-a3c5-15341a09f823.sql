-- ===========================================
-- FASE 3 — Kanban + Broadcasts
-- ===========================================

-- 1) couple_suppliers: suportar "fora_da_plataforma"
ALTER TABLE public.couple_suppliers
  ALTER COLUMN supplier_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_supplier_name text,
  ADD COLUMN IF NOT EXISTS external_supplier_phone text,
  ADD COLUMN IF NOT EXISTS external_supplier_category text;

-- garante que: se for externo, precisa de nome; se não, precisa de supplier_id
ALTER TABLE public.couple_suppliers
  DROP CONSTRAINT IF EXISTS couple_suppliers_external_or_supplier_chk;
ALTER TABLE public.couple_suppliers
  ADD CONSTRAINT couple_suppliers_external_or_supplier_chk
  CHECK (
    (is_external = true AND external_supplier_name IS NOT NULL)
    OR
    (is_external = false AND supplier_id IS NOT NULL)
  );

-- 2) broadcast_gatilhos — regras configuráveis pelo admin
CREATE TABLE IF NOT EXISTS public.broadcast_gatilhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN (
    'dias_antes_casamento',
    'dias_apos_pagamento_vencido',
    'dias_antes_pagamento',
    'sem_atividade_dias',
    'rsvp_pendente'
  )),
  dias integer NOT NULL DEFAULT 0,
  publico_alvo text NOT NULL CHECK (publico_alvo IN ('couples', 'suppliers', 'all')),
  titulo text NOT NULL,
  corpo text NOT NULL,
  link text,
  canais text[] NOT NULL DEFAULT ARRAY['platform'],  -- platform, email, wa_link
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_gatilhos_ativo ON public.broadcast_gatilhos(ativo);

ALTER TABLE public.broadcast_gatilhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia gatilhos"
  ON public.broadcast_gatilhos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- log de execuções de gatilhos para evitar duplicidade
CREATE TABLE IF NOT EXISTS public.broadcast_gatilho_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gatilho_id uuid NOT NULL REFERENCES public.broadcast_gatilhos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contexto jsonb DEFAULT '{}'::jsonb,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gatilho_id, user_id, contexto)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_exec_gatilho ON public.broadcast_gatilho_execucoes(gatilho_id);

ALTER TABLE public.broadcast_gatilho_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lê execuções"
  ON public.broadcast_gatilho_execucoes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- atualiza updated_at automaticamente
CREATE TRIGGER trg_broadcast_gatilhos_updated
  BEFORE UPDATE ON public.broadcast_gatilhos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seeds iniciais (alguns gatilhos prontos)
INSERT INTO public.broadcast_gatilhos (nome, descricao, tipo, dias, publico_alvo, titulo, corpo, link, canais)
VALUES
  ('Faltam 90 dias', 'Lembrete a 90 dias do casamento', 'dias_antes_casamento', 90, 'couples',
   'Faltam 90 dias para o seu grande dia! 💍',
   'Hora de confirmar fornecedores, fechar cardápio e enviar save-the-dates. Veja o checklist.',
   '/tarefas', ARRAY['platform','email']),
  ('Faltam 30 dias', 'Lembrete a 30 dias do casamento', 'dias_antes_casamento', 30, 'couples',
   'Faltam 30 dias! Hora dos detalhes finais',
   'Confirme RSVPs, finalize prova de roupa, pague pendências e revise o roteiro com o cerimonialista.',
   '/tarefas', ARRAY['platform','email']),
  ('Faltam 7 dias', 'Reta final', 'dias_antes_casamento', 7, 'couples',
   'A semana chegou! 🎉',
   'Reveja a logística do dia, confirme horários com fornecedores e tire um tempo pra respirar.',
   '/meus-fornecedores', ARRAY['platform','email']),
  ('Pagamento vencido há 3 dias', 'Cobrança suave', 'dias_apos_pagamento_vencido', 3, 'couples',
   'Você tem pagamentos vencidos',
   'Verifique seus compromissos pendentes para evitar problemas com fornecedores.',
   '/orcamento', ARRAY['platform','email'])
ON CONFLICT DO NOTHING;