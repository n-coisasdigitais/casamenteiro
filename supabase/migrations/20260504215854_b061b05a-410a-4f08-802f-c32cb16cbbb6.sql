
-- Default tasks (editable by admin)
CREATE TABLE public.default_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'recommended',
  due_period text,
  sort_order integer NOT NULL DEFAULT 0,
  action_label text,
  action_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.default_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages default tasks" ON public.default_tasks
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Public reads active default tasks" ON public.default_tasks
  FOR SELECT USING (active = true OR has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_default_tasks_updated BEFORE UPDATE ON public.default_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Broadcast history
CREATE TABLE public.broadcast_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  segment text NOT NULL,
  filters jsonb,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  recipients_count integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'in_app',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads broadcast history" ON public.broadcast_history
  FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin writes broadcast history" ON public.broadcast_history
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') AND admin_id = auth.uid());

-- System settings
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Settings are public read" ON public.system_settings
  FOR SELECT USING (true);

-- Segmented broadcast
CREATE OR REPLACE FUNCTION public.admin_broadcast_segmented(
  _segment text, _title text, _body text, _link text DEFAULT NULL,
  _city text DEFAULT NULL, _category_id uuid DEFAULT NULL,
  _days_to_wedding_max integer DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer := 0; BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _segment = 'couples' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT p.user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles p
    LEFT JOIN public.couples c ON c.user_id = p.user_id
    WHERE p.account_type = 'couple'
      AND (_city IS NULL OR c.wedding_city ILIKE '%'||_city||'%')
      AND (_days_to_wedding_max IS NULL OR (c.wedding_date IS NOT NULL AND c.wedding_date - CURRENT_DATE <= _days_to_wedding_max));
  ELSIF _segment = 'suppliers' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT p.user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles p
    LEFT JOIN public.suppliers s ON s.user_id = p.user_id
    WHERE p.account_type = 'supplier'
      AND (_city IS NULL OR s.city ILIKE '%'||_city||'%')
      AND (_category_id IS NULL OR s.category_id = _category_id);
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type IN ('couple','supplier');
  END IF;
  GET DIAGNOSTICS _count = ROW_COUNT;
  INSERT INTO public.broadcast_history (admin_id, segment, filters, title, body, link, recipients_count)
  VALUES (auth.uid(), _segment, jsonb_build_object('city',_city,'category_id',_category_id,'days_max',_days_to_wedding_max), _title, _body, _link, _count);
  RETURN _count;
END; $$;

-- Mark commission paid
CREATE OR REPLACE FUNCTION public.admin_mark_commission_paid(_lead_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.supplier_leads SET comissao_gerada = _amount, updated_at = now() WHERE id = _lead_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), 'commission_paid', 'supplier_leads', _lead_id, jsonb_build_object('amount',_amount));
END; $$;

-- Seed default tasks from CMS table
CREATE OR REPLACE FUNCTION public.seed_default_tasks_from_table(_couple_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.wedding_tasks WHERE couple_id = _couple_id AND is_custom = false;
  INSERT INTO public.wedding_tasks (couple_id, title, category, priority, due_period, sort_order, action_label, action_url)
  SELECT _couple_id, title, category, priority, due_period, sort_order, action_label, action_url
  FROM public.default_tasks WHERE active = true ORDER BY sort_order;
END; $$;

-- Initial settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('budget_distribution', '{"locacao":25,"buffet":20,"decoracao":12,"foto_video":10,"musica":8,"trajes":7,"convites":3,"beleza":3,"lua_de_mel":7,"outros":5}'::jsonb, 'Percentuais padrão de distribuição do orçamento por categoria')
ON CONFLICT (key) DO NOTHING;
