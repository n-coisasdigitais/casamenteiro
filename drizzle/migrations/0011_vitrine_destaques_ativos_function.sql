CREATE OR REPLACE FUNCTION public.vitrine_destaques_ativos(_categoria_id uuid DEFAULT NULL)
RETURNS TABLE(supplier_id uuid, supplier_nome text, cidade text, estado text, categoria_nome text, categoria_slug text,
              imagem_url text, foco_desktop text, foco_mobile text, is_demo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (s.id)
    s.id, s.company_name, s.city, s.state, c.name, c.slug,
    COALESCE(
      CASE WHEN fp.imagem_status = 'aprovada' THEN fp.imagem_url END,
      (SELECT p.photo_url FROM public.supplier_photos p WHERE p.supplier_id = s.id
        ORDER BY p.is_principal DESC NULLS LAST, p.display_order NULLS LAST LIMIT 1),
      s.cover_photo_url, s.profile_photo_url),
    fp.foco_desktop, fp.foco_mobile, COALESCE(s.is_demo, false)
  FROM public.featured_purchases fp
  JOIN public.suppliers s ON s.id = fp.supplier_id
  LEFT JOIN public.categories c ON c.id = COALESCE(fp.escopo_categoria_id, s.category_id)
  WHERE fp.status IN ('ativo', 'pago') AND fp.inicio <= now() AND fp.fim >= now() AND s.status = 'approved'
    AND (
      (_categoria_id IS NULL AND (fp.escopo = 'categoria'
                                  OR (fp.escopo IN ('home', 'home_hero') AND fp.imagem_status = 'aprovada')))
      OR (_categoria_id IS NOT NULL AND fp.escopo = 'categoria'
          AND COALESCE(fp.escopo_categoria_id, s.category_id) = _categoria_id)
    )
  ORDER BY s.id, fp.inicio;
$$;
GRANT EXECUTE ON FUNCTION public.vitrine_destaques_ativos(uuid) TO anon, authenticated, service_role;