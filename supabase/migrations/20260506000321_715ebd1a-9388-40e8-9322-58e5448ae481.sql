UPDATE public.home_simulacoes
SET estilo = CASE
  WHEN estilo ILIKE 'simples%' OR estilo ILIKE 'intim%' THEN 'intimista'
  WHEN estilo ILIKE 'grande%' OR estilo ILIKE 'grand%'  THEN 'grandioso'
  WHEN estilo ILIKE 'm_dio%'  OR estilo ILIKE 'eleg%'   THEN 'elegante'
  WHEN estilo IN ('intimista','elegante','grandioso')   THEN estilo
  ELSE 'elegante'
END
WHERE estilo IS NOT NULL;