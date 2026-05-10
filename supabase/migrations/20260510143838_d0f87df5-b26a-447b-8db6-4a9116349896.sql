
CREATE TABLE IF NOT EXISTS public.cidades_pendentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade TEXT NOT NULL,
  estado TEXT,
  origem TEXT NOT NULL DEFAULT 'supplier',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  user_id UUID,
  notas TEXT,
  resolvida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cidades_pendentes_cidade ON public.cidades_pendentes (lower(cidade));
CREATE INDEX IF NOT EXISTS idx_cidades_pendentes_resolvida ON public.cidades_pendentes (resolvida);

ALTER TABLE public.cidades_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode registrar cidade pendente"
  ON public.cidades_pendentes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins veem cidades pendentes"
  ON public.cidades_pendentes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam cidades pendentes"
  ON public.cidades_pendentes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins removem cidades pendentes"
  ON public.cidades_pendentes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
