CREATE OR REPLACE FUNCTION public.admin_destinatarios_comunicacao(_segment text, _pendencia text DEFAULT 'todos', _demo boolean DEFAULT false)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE='42501'; END IF;
 IF _segment NOT IN ('couples','suppliers','profissionais','genericos','all') OR _segment IS NULL THEN RAISE EXCEPTION 'Segmento inválido'; END IF;
 IF _pendencia NOT IN ('todos','dados','documentos','incompleto') OR _pendencia IS NULL THEN RAISE EXCEPTION 'Filtro inválido'; END IF;
 IF _pendencia <> 'todos' AND _segment NOT IN ('suppliers','profissionais') THEN RAISE EXCEPTION 'Filtro disponível apenas para fornecedores e profissionais'; END IF;
 IF _segment='suppliers' AND _pendencia='documentos' THEN RAISE EXCEPTION 'Documentos obrigatórios de fornecedores ainda não definidos'; END IF;
 RETURN QUERY SELECT DISTINCT p.user_id FROM public.profiles p
 WHERE coalesce(p.is_demo,false)=_demo AND (
  (_segment IN ('couples','all') AND EXISTS(SELECT 1 FROM public.couples c WHERE c.user_id=p.user_id)) OR
  (_segment IN ('genericos','all') AND p.account_type='generico') OR
  (_segment IN ('suppliers','all') AND EXISTS(SELECT 1 FROM public.suppliers s WHERE s.user_id=p.user_id AND coalesce(s.is_demo,false)=_demo AND (_pendencia='todos' OR cardinality(public.fornecedor_pendencias(s.id))>0))) OR
  (_segment IN ('profissionais','all') AND EXISTS(SELECT 1 FROM public.staff_profiles t WHERE t.user_id=p.user_id AND (
   _pendencia='todos' OR
   (_pendencia IN ('dados','incompleto') AND (length(trim(coalesce(t.nome,'')))=0 OR length(regexp_replace(coalesce(t.telefone,''),'\D','','g')) NOT IN (10,11) OR length(trim(coalesce(t.cidade,'')))=0 OR length(trim(coalesce(t.estado,'')))=0 OR coalesce(cardinality(t.funcoes),0)=0 OR NOT coalesce(t.consentimento_lgpd,false))) OR
   (_pendencia IN ('documentos','incompleto') AND (NOT EXISTS(SELECT 1 FROM public.staff_documents d WHERE d.staff_id=t.id) OR EXISTS(SELECT 1 FROM public.staff_documents d WHERE d.staff_id=t.id AND d.status='rejeitado')))
  )))
 );
END; $$;
REVOKE ALL ON FUNCTION public.admin_destinatarios_comunicacao(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_destinatarios_comunicacao(text,text,boolean) TO authenticated,service_role;