
-- =============================================
-- 1. wedding_tasks
-- =============================================
CREATE TABLE public.wedding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  priority TEXT NOT NULL DEFAULT 'recommended',
  due_period TEXT,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  action_label TEXT,
  action_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wedding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple can manage own tasks"
  ON public.wedding_tasks FOR ALL
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

CREATE TRIGGER update_wedding_tasks_updated_at
  BEFORE UPDATE ON public.wedding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. guest_groups
-- =============================================
CREATE TABLE public.guest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple can manage own guest groups"
  ON public.guest_groups FOR ALL
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

-- =============================================
-- 3. wedding_guests
-- =============================================
CREATE TABLE public.wedding_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.guest_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  guest_type TEXT NOT NULL DEFAULT 'adult',
  rsvp_status TEXT NOT NULL DEFAULT 'pending',
  menu_preference TEXT,
  table_number INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wedding_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple can manage own guests"
  ON public.wedding_guests FOR ALL
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

CREATE TRIGGER update_wedding_guests_updated_at
  BEFORE UPDATE ON public.wedding_guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. budget_items
-- =============================================
CREATE TABLE public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  final_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'estimated',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple can manage own budget items"
  ON public.budget_items FOR ALL
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. budget_payments
-- =============================================
CREATE TABLE public.budget_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_item_id UUID NOT NULL REFERENCES public.budget_items(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple can manage own payments"
  ON public.budget_payments FOR ALL
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

-- =============================================
-- 6. couple_suppliers
-- =============================================
CREATE TABLE public.couple_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'saved',
  contract_value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_id, supplier_id)
);

ALTER TABLE public.couple_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple can manage own suppliers"
  ON public.couple_suppliers FOR ALL
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

CREATE TRIGGER update_couple_suppliers_updated_at
  BEFORE UPDATE ON public.couple_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. Storage bucket for couple photos
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('couple-photos', 'couple-photos', true);

CREATE POLICY "Couple can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'couple-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Couple can update own photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'couple-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Couple photos are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'couple-photos');

-- =============================================
-- 8. Seed default tasks function
-- =============================================
CREATE OR REPLACE FUNCTION public.seed_default_tasks(_couple_id UUID, _wedding_date DATE DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wedding_tasks (couple_id, title, category, priority, due_period, sort_order) VALUES
  -- 10-12 meses antes
  (_couple_id, 'Definir o estilo e tema do casamento', 'planejamento', 'essential', '10-12 meses', 1),
  (_couple_id, 'Definir o orçamento total', 'orcamento', 'essential', '10-12 meses', 2),
  (_couple_id, 'Montar a lista preliminar de convidados', 'convidados', 'essential', '10-12 meses', 3),
  (_couple_id, 'Pesquisar e visitar locais para a cerimônia', 'cerimonia', 'essential', '10-12 meses', 4),
  (_couple_id, 'Pesquisar e visitar locais para a recepção', 'recepcao', 'essential', '10-12 meses', 5),
  (_couple_id, 'Contratar o local da cerimônia e recepção', 'recepcao', 'essential', '10-12 meses', 6),
  (_couple_id, 'Pesquisar e contratar assessoria/cerimonialista', 'planejamento', 'recommended', '10-12 meses', 7),
  (_couple_id, 'Pesquisar fotógrafos e videomakers', 'foto-video', 'essential', '10-12 meses', 8),
  (_couple_id, 'Pesquisar DJs e bandas', 'musica', 'recommended', '10-12 meses', 9),
  (_couple_id, 'Pesquisar buffet/catering', 'buffet', 'essential', '10-12 meses', 10),
  
  -- 7-9 meses antes
  (_couple_id, 'Contratar fotógrafo e videomaker', 'foto-video', 'essential', '7-9 meses', 11),
  (_couple_id, 'Contratar DJ ou banda', 'musica', 'essential', '7-9 meses', 12),
  (_couple_id, 'Contratar buffet/catering', 'buffet', 'essential', '7-9 meses', 13),
  (_couple_id, 'Pesquisar e escolher o convite', 'convites', 'recommended', '7-9 meses', 14),
  (_couple_id, 'Definir madrinhas e padrinhos', 'cerimonia', 'essential', '7-9 meses', 15),
  (_couple_id, 'Pesquisar florista e decoração', 'decoracao', 'essential', '7-9 meses', 16),
  (_couple_id, 'Contratar florista e decoração', 'decoracao', 'essential', '7-9 meses', 17),
  (_couple_id, 'Pesquisar vestido de noiva / traje do noivo', 'trajes', 'essential', '7-9 meses', 18),
  (_couple_id, 'Definir lista de presentes', 'presentes', 'recommended', '7-9 meses', 19),
  (_couple_id, 'Pesquisar papelaria (save the date, convites)', 'convites', 'recommended', '7-9 meses', 20),
  
  -- 4-6 meses antes
  (_couple_id, 'Encomendar/comprar vestido de noiva', 'trajes', 'essential', '4-6 meses', 21),
  (_couple_id, 'Encomendar/comprar traje do noivo', 'trajes', 'essential', '4-6 meses', 22),
  (_couple_id, 'Contratar bolo e doces', 'buffet', 'essential', '4-6 meses', 23),
  (_couple_id, 'Enviar Save the Date', 'convites', 'recommended', '4-6 meses', 24),
  (_couple_id, 'Agendar degustação do buffet', 'buffet', 'recommended', '4-6 meses', 25),
  (_couple_id, 'Pesquisar e contratar transporte', 'logistica', 'recommended', '4-6 meses', 26),
  (_couple_id, 'Planejar lua de mel', 'lua-de-mel', 'recommended', '4-6 meses', 27),
  (_couple_id, 'Reservar hospedagem para convidados de fora', 'logistica', 'optional', '4-6 meses', 28),
  (_couple_id, 'Contratar iluminação e som', 'decoracao', 'recommended', '4-6 meses', 29),
  (_couple_id, 'Definir o cardápio final', 'buffet', 'essential', '4-6 meses', 30),
  
  -- 2-3 meses antes
  (_couple_id, 'Enviar convites oficiais', 'convites', 'essential', '2-3 meses', 31),
  (_couple_id, 'Primeira prova do vestido/traje', 'trajes', 'essential', '2-3 meses', 32),
  (_couple_id, 'Definir votos (se personalizados)', 'cerimonia', 'optional', '2-3 meses', 33),
  (_couple_id, 'Escolher alianças', 'cerimonia', 'essential', '2-3 meses', 34),
  (_couple_id, 'Planejar despedida de solteiro(a)', 'eventos', 'optional', '2-3 meses', 35),
  (_couple_id, 'Contratar cabeleireiro e maquiador', 'beleza', 'essential', '2-3 meses', 36),
  (_couple_id, 'Fazer teste de cabelo e maquiagem', 'beleza', 'recommended', '2-3 meses', 37),
  (_couple_id, 'Comprar acessórios (sapatos, véu, etc)', 'trajes', 'recommended', '2-3 meses', 38),
  (_couple_id, 'Confirmar todos os fornecedores', 'planejamento', 'essential', '2-3 meses', 39),
  (_couple_id, 'Organizar disposição das mesas', 'convidados', 'recommended', '2-3 meses', 40),
  
  -- Último mês
  (_couple_id, 'Última prova do vestido/traje', 'trajes', 'essential', 'ultimo-mes', 41),
  (_couple_id, 'Confirmar RSVP dos convidados', 'convidados', 'essential', 'ultimo-mes', 42),
  (_couple_id, 'Confirmar número final de convidados com buffet', 'buffet', 'essential', 'ultimo-mes', 43),
  (_couple_id, 'Reunião final com cerimonialista', 'planejamento', 'essential', 'ultimo-mes', 44),
  (_couple_id, 'Preparar roteiro da cerimônia', 'cerimonia', 'essential', 'ultimo-mes', 45),
  (_couple_id, 'Ensaio da cerimônia', 'cerimonia', 'recommended', 'ultimo-mes', 46),
  (_couple_id, 'Organizar documentação para o casamento civil', 'legal', 'essential', 'ultimo-mes', 47),
  (_couple_id, 'Preparar kit de emergência', 'logistica', 'recommended', 'ultimo-mes', 48),
  (_couple_id, 'Confirmar transporte e logística', 'logistica', 'essential', 'ultimo-mes', 49),
  (_couple_id, 'Finalizar playlist/setlist com DJ/banda', 'musica', 'recommended', 'ultimo-mes', 50),
  
  -- Última semana
  (_couple_id, 'Confirmar horários com todos os fornecedores', 'planejamento', 'essential', 'ultima-semana', 51),
  (_couple_id, 'Separar e organizar todos os pagamentos finais', 'orcamento', 'essential', 'ultima-semana', 52),
  (_couple_id, 'Embalar malas para lua de mel', 'lua-de-mel', 'recommended', 'ultima-semana', 53),
  (_couple_id, 'Fazer spa/relaxar', 'beleza', 'optional', 'ultima-semana', 54),
  (_couple_id, 'Preparar gorjetas e agradecimentos', 'planejamento', 'optional', 'ultima-semana', 55),
  
  -- Dia do casamento
  (_couple_id, 'Café da manhã leve e hidratação', 'dia-do-casamento', 'recommended', 'dia-do-casamento', 56),
  (_couple_id, 'Cabelo e maquiagem', 'dia-do-casamento', 'essential', 'dia-do-casamento', 57),
  (_couple_id, 'Verificar se alianças estão com padrinho', 'dia-do-casamento', 'essential', 'dia-do-casamento', 58),
  (_couple_id, 'Entregar cronograma final ao cerimonialista', 'dia-do-casamento', 'essential', 'dia-do-casamento', 59),
  (_couple_id, 'Aproveitar cada momento!', 'dia-do-casamento', 'essential', 'dia-do-casamento', 60);
END;
$$;

-- =============================================
-- 9. Trigger to seed tasks on onboarding completion
-- =============================================
CREATE OR REPLACE FUNCTION public.trigger_seed_tasks_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed = true AND (OLD.onboarding_completed = false OR OLD.onboarding_completed IS NULL) THEN
    PERFORM public.seed_default_tasks(NEW.id, NEW.wedding_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_tasks_on_onboarding
  AFTER UPDATE ON public.couples
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_tasks_on_onboarding();
