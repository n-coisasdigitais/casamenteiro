ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS em_breve boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.feature_flags.em_breve IS 'Quando a flag está desligada e em_breve = true (padrão), as páginas públicas mostram a funcionalidade com o selo "Em breve". Com em_breve = false, ela some.';
INSERT INTO public.system_settings (key, value, description)
SELECT 'fornecedor_aprovacao_horas', '{"horas": 24}'::jsonb, 'Prazo máximo, em horas, para a equipe aprovar um novo cadastro de fornecedor.'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'fornecedor_aprovacao_horas');