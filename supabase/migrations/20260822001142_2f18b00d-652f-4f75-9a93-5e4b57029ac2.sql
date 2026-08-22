CREATE OR REPLACE FUNCTION public.registrar_minha_indicacao_fornecedor(_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sup public.suppliers;
  _status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Faça login para registrar a indicação.');
  END IF;

  SELECT * INTO _sup FROM public.suppliers WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF _sup.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cadastro de fornecedor não encontrado.');
  END IF;

  IF _sup.status = 'approved' AND coalesce(_sup.onboarding_completed, false) THEN
    _status := 'cadastro_completo';
  ELSE
    _status := 'cadastro_incompleto';
  END IF;

  RETURN public.registrar_etapa_indicacao_fornecedor(
    auth.uid(), _codigo, _status, _sup.id, _sup.company_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_minha_indicacao_fornecedor(text) FROM anon;