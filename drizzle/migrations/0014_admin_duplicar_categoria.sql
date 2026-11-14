CREATE OR REPLACE FUNCTION public.admin_duplicar_categoria(p_origem uuid, p_nome text, p_slug text, p_icon text, p_description text, p_active boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso permitido somente para administradores.' USING ERRCODE = '42501';
  END IF;
  IF p_nome IS NULL OR length(btrim(p_nome)) = 0 OR length(p_nome) > 255 OR p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(p_slug) > 255 OR p_active IS NULL THEN
    RAISE EXCEPTION 'Nome e endereço da categoria são inválidos.' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.categories WHERE id = p_origem;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Categoria de origem não encontrada.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.categories(name, slug, icon, description, active)
  VALUES (btrim(p_nome), p_slug, p_icon, p_description, p_active)
  RETURNING id INTO v_id;
  INSERT INTO public.campos_categoria(category_id, chave, label, ajuda, tipo, opcoes, obrigatorio, grupo, ordem, ativo, mostrar_no_perfil, is_base, placeholder)
  SELECT v_id, chave, label, ajuda, tipo, opcoes, obrigatorio, grupo, ordem, ativo, mostrar_no_perfil, is_base, placeholder
  FROM public.campos_categoria WHERE category_id = p_origem
  ON CONFLICT (category_id, chave) DO UPDATE SET label = EXCLUDED.label, ajuda = EXCLUDED.ajuda, tipo = EXCLUDED.tipo, opcoes = EXCLUDED.opcoes, obrigatorio = EXCLUDED.obrigatorio, grupo = EXCLUDED.grupo, ordem = EXCLUDED.ordem, ativo = EXCLUDED.ativo, mostrar_no_perfil = EXCLUDED.mostrar_no_perfil, is_base = EXCLUDED.is_base, placeholder = EXCLUDED.placeholder;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_duplicar_categoria(uuid,text,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_duplicar_categoria(uuid,text,text,text,text,boolean) TO authenticated;