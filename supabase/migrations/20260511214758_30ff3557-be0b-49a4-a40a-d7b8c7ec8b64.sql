-- Separa a busca de cidades do fornecedor da lógica de demanda dos noivos
CREATE OR REPLACE FUNCTION public.cidades_disponiveis(_prefix text)
RETURNS TABLE(cidade text, estado text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (lower(s.city), s.state)
    s.city AS cidade,
    s.state AS estado
  FROM public.suppliers s
  WHERE s.status = 'approved'
    AND s.city IS NOT NULL
    AND s.city <> ''
    AND (_prefix IS NULL OR _prefix = '' OR s.city ILIKE (_prefix || '%') OR s.city ILIKE ('%' || _prefix || '%'))
  ORDER BY lower(s.city), s.state NULLS LAST
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.buscar_cidades_brasil(_prefix text)
RETURNS TABLE(cidade text, estado text, lat numeric, lng numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.cidade, c.estado, c.lat, c.lng
  FROM public.cidades_coordenadas c
  WHERE _prefix IS NOT NULL
    AND length(trim(_prefix)) >= 2
    AND (c.cidade ILIKE (_prefix || '%') OR c.cidade ILIKE ('%' || _prefix || '%'))
  ORDER BY
    CASE WHEN c.cidade ILIKE (_prefix || '%') THEN 0 ELSE 1 END,
    c.cidade,
    c.estado
  LIMIT 20;
$$;

INSERT INTO public.cidades_coordenadas (cidade, estado, lat, lng) VALUES
('Formiga','MG',-20.4644,-45.4269),
('Pains','MG',-20.3708,-45.6614),
('Arcos','MG',-20.2863,-45.5397),
('Córrego Fundo','MG',-20.4472,-45.5556),
('Iguatama','MG',-20.1744,-45.7111),
('Pimenta','MG',-20.4828,-45.8044),
('Lagoa da Prata','MG',-20.0228,-45.5436),
('Santo Antônio do Monte','MG',-20.0872,-45.2931),
('Campo Belo','MG',-20.8972,-45.2772),
('Candeias','MG',-20.7692,-45.2764)
ON CONFLICT (cidade) DO UPDATE SET
  estado = EXCLUDED.estado,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;