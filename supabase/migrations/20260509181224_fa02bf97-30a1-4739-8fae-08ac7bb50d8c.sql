
-- Tabela de coordenadas
CREATE TABLE IF NOT EXISTS public.cidades_coordenadas (
  cidade text PRIMARY KEY,
  estado text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL
);
ALTER TABLE public.cidades_coordenadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordenadas são públicas" ON public.cidades_coordenadas FOR SELECT USING (true);
CREATE POLICY "Admin gerencia coordenadas" ON public.cidades_coordenadas FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Tabela de interesse de cidades não atendidas
CREATE TABLE IF NOT EXISTS public.cidades_interesse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade text NOT NULL,
  estado text,
  simulacao_id uuid REFERENCES public.home_simulacoes(id) ON DELETE SET NULL,
  atendida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cidades_interesse_cidade ON public.cidades_interesse (lower(cidade));
ALTER TABLE public.cidades_interesse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um registra interesse" ON public.cidades_interesse FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin lê interesse" ON public.cidades_interesse FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin atualiza interesse" ON public.cidades_interesse FOR UPDATE
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Atendimento dos fornecedores
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cidades_atendidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raio_atendimento_km integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

-- Função para autocomplete
CREATE OR REPLACE FUNCTION public.cidades_disponiveis(_prefix text)
RETURNS TABLE(cidade text, estado text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (lower(s.city))
    s.city AS cidade,
    s.state AS estado
  FROM public.suppliers s
  WHERE s.status = 'approved'
    AND s.city IS NOT NULL
    AND s.city <> ''
    AND (_prefix IS NULL OR _prefix = '' OR s.city ILIKE (_prefix || '%') OR s.city ILIKE ('%' || _prefix || '%'))
  ORDER BY lower(s.city)
  LIMIT 10;
$$;

-- Seed de coordenadas (top 50 MG)
INSERT INTO public.cidades_coordenadas (cidade, estado, lat, lng) VALUES
('Belo Horizonte','MG',-19.9167,-43.9345),
('Contagem','MG',-19.9320,-44.0539),
('Betim','MG',-19.9678,-44.1981),
('Nova Lima','MG',-19.9858,-43.8467),
('Santa Luzia','MG',-19.7697,-43.8512),
('Ribeirão das Neves','MG',-19.7669,-44.0867),
('Sabará','MG',-19.8889,-43.8056),
('Ibirité','MG',-20.0247,-44.0586),
('Vespasiano','MG',-19.6917,-43.9233),
('Lagoa Santa','MG',-19.6275,-43.8908),
('Pedro Leopoldo','MG',-19.6181,-44.0431),
('Esmeraldas','MG',-19.7644,-44.3122),
('Brumadinho','MG',-20.1428,-44.1997),
('Mateus Leme','MG',-19.9722,-44.4344),
('Igarapé','MG',-20.0708,-44.3022),
('Confins','MG',-19.6242,-43.9706),
('Juiz de Fora','MG',-21.7611,-43.3489),
('Uberlândia','MG',-18.9186,-48.2772),
('Uberaba','MG',-19.7483,-47.9319),
('Montes Claros','MG',-16.7286,-43.8581),
('Ribeirão Preto','SP',-21.1775,-47.8103),
('Governador Valadares','MG',-18.8511,-41.9494),
('Ipatinga','MG',-19.4683,-42.5369),
('Sete Lagoas','MG',-19.4658,-44.2469),
('Divinópolis','MG',-20.1433,-44.8839),
('Poços de Caldas','MG',-21.7878,-46.5614),
('Patos de Minas','MG',-18.5789,-46.5181),
('Pouso Alegre','MG',-22.2306,-45.9367),
('Teófilo Otoni','MG',-17.8575,-41.5036),
('Barbacena','MG',-21.2258,-43.7747),
('Sabará','MG',-19.8889,-43.8056),
('Conselheiro Lafaiete','MG',-20.6597,-43.7858),
('Itabira','MG',-19.6228,-43.2272),
('Araguari','MG',-18.6453,-48.1872),
('Ubá','MG',-21.1206,-42.9425),
('Lavras','MG',-21.2450,-44.9994),
('Itaúna','MG',-20.0794,-44.5764),
('Passos','MG',-20.7194,-46.6111),
('Coronel Fabriciano','MG',-19.5181,-42.6286),
('Muriaé','MG',-21.1306,-42.3667),
('Araxá','MG',-19.5919,-46.9436),
('Itajubá','MG',-22.4253,-45.4528),
('Ouro Preto','MG',-20.3856,-43.5036),
('Mariana','MG',-20.3781,-43.4150),
('Tiradentes','MG',-21.1075,-44.1722),
('São João del-Rei','MG',-21.1361,-44.2611),
('Diamantina','MG',-18.2403,-43.6003),
('Caxambu','MG',-21.9772,-44.9333),
('Jaboticatubas','MG',-19.5089,-43.7444),
('Caeté','MG',-19.8983,-43.6667),
('Itabirito','MG',-20.2517,-43.8014)
ON CONFLICT (cidade) DO NOTHING;
