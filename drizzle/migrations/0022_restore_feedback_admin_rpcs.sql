ALTER TABLE public.suporte_reportes ADD COLUMN IF NOT EXISTS resposta text, ADD COLUMN IF NOT EXISTS respondido_em timestamptz;
GRANT SELECT, INSERT ON public.suporte_reportes TO authenticated;
GRANT ALL ON public.suporte_reportes TO service_role;
CREATE OR REPLACE FUNCTION public.admin_listar_feedback(_status text DEFAULT NULL, _tipo text DEFAULT NULL)
RETURNS TABLE(id uuid, created_at timestamptz, user_id uuid, nome text, email text, conta text, origem text, tipo text, assunto text, descricao text, solucao_sugerida text, pagina text, anexo_path text, status text, resposta text, respondido_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT r.id, r.created_at, r.user_id, p.full_name::text, u.email::text, p.account_type::text, r.origem, r.tipo, r.assunto, r.descricao, r.solucao_sugerida, r.pagina, r.anexo_path, r.status, r.resposta, r.respondido_em
 FROM public.suporte_reportes r LEFT JOIN public.profiles p ON p.user_id=r.user_id LEFT JOIN auth.users u ON u.id=r.user_id
 WHERE (_status IS NULL OR r.status=_status) AND (_tipo IS NULL OR r.tipo=_tipo) ORDER BY r.created_at DESC LIMIT 500;
END; $$;
CREATE OR REPLACE FUNCTION public.admin_feedback_abertos() RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE = '42501'; END IF;
 RETURN (SELECT count(*) FROM public.suporte_reportes WHERE status='aberto');
END; $$;
CREATE OR REPLACE FUNCTION public.admin_atualizar_feedback(_id uuid, _status text, _resposta text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE = '42501'; END IF;
 IF _status IS NULL OR _status NOT IN ('aberto','respondido','resolvido') THEN RAISE EXCEPTION 'Status inválido'; END IF;
 IF _resposta IS NOT NULL AND (length(trim(_resposta))=0 OR length(_resposta)>3000) THEN RAISE EXCEPTION 'Resposta inválida (máximo de 3000 caracteres)'; END IF;
 UPDATE public.suporte_reportes SET status=_status, resposta=COALESCE(trim(_resposta), resposta), respondido_em=CASE WHEN _resposta IS NOT NULL THEN now() ELSE respondido_em END WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Feedback não encontrado'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_listar_feedback(text,text), public.admin_feedback_abertos(), public.admin_atualizar_feedback(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_feedback(text,text), public.admin_feedback_abertos(), public.admin_atualizar_feedback(uuid,text,text) TO authenticated, service_role;