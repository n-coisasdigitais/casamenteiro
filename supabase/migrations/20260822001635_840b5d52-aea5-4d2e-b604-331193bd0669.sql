REVOKE ALL ON FUNCTION public.marcar_indicacao_assinatura(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consumir_creditos_ciclo(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_indicacao_assinatura(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consumir_creditos_ciclo(uuid, numeric) TO service_role;