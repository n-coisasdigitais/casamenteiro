-- Funções internas: só triggers/servidor devem chamar
REVOKE EXECUTE ON FUNCTION public.log_platform_event(text,text,uuid,text,text,jsonb,jsonb,jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.purge_platform_events(integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_base_category_fields(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_default_tasks(uuid,date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_default_tasks_from_table(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_default_tasks_smart(uuid,date) FROM anon, authenticated, public;
-- Ações que exigem login: visitante anônimo não pode chamar
REVOKE EXECUTE ON FUNCTION public.cancelar_reserva_fornecedor(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cancelar_reserva_fornecedor(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_platform_event(text,text,uuid,text,text,jsonb,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_platform_events(integer) TO service_role;