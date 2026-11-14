CREATE OR REPLACE FUNCTION public.profissional_config_atual_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.profissional_landing_config ORDER BY updated_at DESC NULLS LAST, id LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.profissional_config_atual_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profissional_config_atual_id() TO anon, authenticated;
ALTER POLICY "Config atual da página de profissional é pública" ON public.profissional_landing_config
USING (id = public.profissional_config_atual_id());