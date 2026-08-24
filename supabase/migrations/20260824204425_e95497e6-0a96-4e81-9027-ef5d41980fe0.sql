GRANT UPDATE ON public.payment_intents TO authenticated;

CREATE POLICY "Dono pode cancelar cobranca pendente"
ON public.payment_intents
FOR UPDATE
TO authenticated
USING (
  status IN ('pending','pendente','in_process','created','iniciado','aguardando')
  AND (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = payment_intents.supplier_id AND s.user_id = auth.uid())
  )
)
WITH CHECK (
  status = 'cancelled'
  AND (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = payment_intents.supplier_id AND s.user_id = auth.uid())
  )
);