
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Trigger: notify supplier when a quote is created
CREATE OR REPLACE FUNCTION public.notify_supplier_on_quote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _supplier_user UUID;
  _supplier_name TEXT;
BEGIN
  SELECT user_id, company_name INTO _supplier_user, _supplier_name
  FROM public.suppliers WHERE id = NEW.supplier_id;
  IF _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _supplier_user,
      'quote_received',
      'Novo pedido de orçamento!',
      'Você recebeu um novo pedido de orçamento. Responda rápido para aumentar suas chances.',
      '/painel-fornecedor?tab=quotes'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_supplier_on_quote
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_on_quote();

-- Trigger: notify suppliers featured in a simulation result
CREATE OR REPLACE FUNCTION public.notify_suppliers_on_simulation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _category JSONB;
  _supp JSONB;
  _supplier_user UUID;
BEGIN
  IF NEW.resultado IS NULL THEN RETURN NEW; END IF;

  FOR _category IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.resultado->'categorias', '[]'::jsonb))
  LOOP
    FOR _supp IN SELECT * FROM jsonb_array_elements(COALESCE(_category->'suppliers', '[]'::jsonb))
    LOOP
      SELECT user_id INTO _supplier_user
      FROM public.suppliers WHERE id = (_supp->>'id')::uuid;
      IF _supplier_user IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
          _supplier_user,
          'simulation_match',
          'Você apareceu em uma nova simulação',
          'Um casal acabou de simular o casamento e você entrou nas opções. Mantenha seu perfil atualizado!',
          '/painel-fornecedor'
        );
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_suppliers_on_simulation
AFTER INSERT ON public.home_simulacoes
FOR EACH ROW EXECUTE FUNCTION public.notify_suppliers_on_simulation();
