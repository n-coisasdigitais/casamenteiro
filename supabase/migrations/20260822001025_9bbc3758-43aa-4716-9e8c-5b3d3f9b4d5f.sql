REVOKE EXECUTE ON FUNCTION public.get_or_create_supplier_referral(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resgatar_cupom(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_conceder_beneficio(uuid, text, numeric, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.registrar_etapa_indicacao_fornecedor(uuid, text, text, uuid, text) FROM anon, authenticated;