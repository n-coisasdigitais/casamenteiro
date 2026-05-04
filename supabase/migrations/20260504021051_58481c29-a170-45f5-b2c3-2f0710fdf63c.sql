
CREATE POLICY "Dono atualiza simulação"
ON public.home_simulacoes
FOR UPDATE
USING (
  ((user_id IS NOT NULL) AND (user_id = auth.uid()))
  OR ((couple_id IS NOT NULL) AND (couple_id = get_couple_id_for_user(auth.uid())))
  OR has_role(auth.uid(), 'admin'::app_role)
);
