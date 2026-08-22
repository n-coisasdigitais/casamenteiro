REVOKE EXECUTE ON FUNCTION public.get_or_create_supplier_referral(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_supplier_referral(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.resgatar_cupom(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resgatar_cupom(uuid, text, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_conceder_beneficio(uuid, text, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_conceder_beneficio(uuid, text, numeric, integer, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.registrar_minha_indicacao_fornecedor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_minha_indicacao_fornecedor(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.registrar_etapa_indicacao_fornecedor(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_etapa_indicacao_fornecedor(uuid, text, text, uuid, text) TO service_role;