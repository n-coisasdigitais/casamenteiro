
CREATE OR REPLACE FUNCTION public.seed_default_tasks(_couple_id uuid, _wedding_date date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Limpar tarefas anteriores não customizadas
  DELETE FROM public.wedding_tasks WHERE couple_id = _couple_id AND is_custom = false;

  INSERT INTO public.wedding_tasks (couple_id, title, category, priority, due_period, sort_order, action_label, action_url) VALUES
  -- Fase 1: De 10 a 12 meses antes
  (_couple_id, 'Vamos casar! E agora?', 'planejamento', 'recommended', '10-12 meses', 1, NULL, NULL),
  (_couple_id, 'Primeiro passo: baixar o App!', 'planejamento', 'recommended', '10-12 meses', 2, NULL, NULL),
  (_couple_id, 'Escolher a data e o tipo de casamento', 'planejamento', 'essential', '10-12 meses', 3, NULL, NULL),
  (_couple_id, 'Os noivos devem organizar tudo ou é melhor contratar um(a) cerimonialista/wedding planner?', 'planejamento', 'recommended', '10-12 meses', 4, 'Ver cerimonialistas', '/buscar?categoria=cerimonialista'),
  (_couple_id, 'Fazer primeira lista de convidados', 'planejamento', 'essential', '10-12 meses', 5, 'Ir para convidados', '/convidados'),
  (_couple_id, 'Vincular os perfis de Casamentos.com.br', 'planejamento', 'optional', '10-12 meses', 6, NULL, NULL),
  (_couple_id, 'Anuncie seu casamento', 'planejamento', 'optional', '10-12 meses', 7, NULL, NULL),
  (_couple_id, 'Quanto vamos gastar?', 'planejamento', 'essential', '10-12 meses', 8, 'Ir para orçamento', '/orcamento'),
  (_couple_id, 'Escolher o tipo de cerimônia e o tipo de local', 'cerimonia', 'essential', '10-12 meses', 9, NULL, NULL),
  (_couple_id, 'Confirmar o dia e a hora do evento', 'cerimonia', 'essential', '10-12 meses', 10, NULL, NULL),
  (_couple_id, 'Buscar e contratar o Juiz de Paz e/ou Celebrante', 'cerimonia', 'essential', '10-12 meses', 11, NULL, NULL),
  (_couple_id, 'Avaliar orçamentos e os espaços para a recepção', 'recepcao', 'essential', '10-12 meses', 12, 'Ver espaços', '/buscar?categoria=recepcao'),
  (_couple_id, 'Reservar o espaço para a recepção', 'recepcao', 'essential', '10-12 meses', 13, NULL, NULL),
  (_couple_id, 'Buscar e reservar o buffet ou catering', 'recepcao', 'essential', '10-12 meses', 14, 'Ver buffets', '/buscar?categoria=buffet'),
  (_couple_id, 'Organizar as mesas dos convidados', 'recepcao', 'recommended', '10-12 meses', 15, 'Ir para convidados', '/convidados'),
  (_couple_id, 'Hora de buscar o fotógrafo!', 'foto-video', 'essential', '10-12 meses', 16, 'Ver fotógrafos', '/buscar?categoria=fotografia'),
  (_couple_id, 'Buscar orçamentos para a música da cerimônia', 'musica', 'recommended', '10-12 meses', 17, 'Ver músicos', '/buscar?categoria=musica'),
  (_couple_id, 'Procurar orçamentos para uma banda ou DJ para a festa', 'musica', 'recommended', '10-12 meses', 18, 'Ver DJs e bandas', '/buscar?categoria=musica'),
  (_couple_id, 'Pensar em atividades e na animação para a festa', 'recepcao', 'optional', '10-12 meses', 19, NULL, NULL),
  (_couple_id, 'Tem convidados que moram longe? Hora de buscar hospedagem ou transporte para eles', 'planejamento', 'recommended', '10-12 meses', 20, NULL, NULL),
  (_couple_id, 'Contratar o fotógrafo', 'foto-video', 'essential', '10-12 meses', 21, 'Ver fotógrafos', '/buscar?categoria=fotografia'),
  (_couple_id, 'Contratar os músicos do casamento', 'musica', 'essential', '10-12 meses', 22, 'Ver músicos', '/buscar?categoria=musica'),
  (_couple_id, 'Encomendar os "Save the Date" (pré-convites de casamento)', 'convites', 'recommended', '10-12 meses', 23, NULL, NULL),
  (_couple_id, 'Fazer lista de destinos para Lua de Mel', 'lua-de-mel', 'recommended', '10-12 meses', 24, NULL, NULL),

  -- Fase 2: De 7 a 9 meses antes
  (_couple_id, 'Começar a pesquisar vestidos de noiva', 'trajes', 'recommended', '7-9 meses', 25, NULL, NULL),
  (_couple_id, 'Avisar sobre o casamento no trabalho', 'planejamento', 'recommended', '7-9 meses', 26, NULL, NULL),
  (_couple_id, 'Começar os trâmites de documentos do casamento civil', 'legal', 'essential', '7-9 meses', 27, NULL, NULL),
  (_couple_id, 'Começar os trâmites para o casamento religioso', 'legal', 'essential', '7-9 meses', 28, NULL, NULL),
  (_couple_id, 'Buscar orçamentos de floristas e decoração de casamento', 'decoracao', 'essential', '7-9 meses', 29, 'Ver decoradores', '/buscar?categoria=decoracao'),
  (_couple_id, 'Pensar em fazer algo de artesanato (DIY)', 'detalhes', 'optional', '7-9 meses', 30, NULL, NULL),
  (_couple_id, 'Procurar estilos de buquês de noiva', 'decoracao', 'recommended', '7-9 meses', 31, NULL, NULL),
  (_couple_id, 'Buscar as alianças', 'cerimonia', 'essential', '7-9 meses', 32, NULL, NULL),
  (_couple_id, 'Hora de provar vestidos de noiva', 'trajes', 'essential', '7-9 meses', 33, NULL, NULL),
  (_couple_id, 'Alugar ou comprar o vestido de noiva?', 'trajes', 'recommended', '7-9 meses', 34, NULL, NULL),
  (_couple_id, 'E então? Como vai a organização do casamento?', 'planejamento', 'optional', '7-9 meses', 35, NULL, NULL),
  (_couple_id, 'Encomendar o vestido de noiva', 'trajes', 'essential', '7-9 meses', 36, NULL, NULL),
  (_couple_id, 'Provar o vestido de noiva', 'trajes', 'recommended', '7-9 meses', 37, NULL, NULL),
  (_couple_id, 'Decidir a agência para a Lua de Mel', 'lua-de-mel', 'recommended', '7-9 meses', 38, NULL, NULL),
  (_couple_id, 'Enviar o "Save the date"', 'convites', 'recommended', '7-9 meses', 39, NULL, NULL),

  -- Fase 3: De 4 a 6 meses antes
  (_couple_id, 'Buscar orçamentos de convites de casamento', 'convites', 'recommended', '4-6 meses', 40, NULL, NULL),
  (_couple_id, 'Escolher padrinhos, testemunhas, pajens e damas de honra', 'planejamento', 'essential', '4-6 meses', 41, NULL, NULL),
  (_couple_id, 'Contratar florista e decoração', 'decoracao', 'essential', '4-6 meses', 42, 'Ver decoradores', '/buscar?categoria=decoracao'),
  (_couple_id, 'Encomendar/comprar traje do noivo', 'trajes', 'essential', '4-6 meses', 43, NULL, NULL),
  (_couple_id, 'Contratar bolo e doces', 'buffet', 'essential', '4-6 meses', 44, 'Ver confeitarias', '/buscar?categoria=buffet'),
  (_couple_id, 'Agendar degustação do buffet', 'buffet', 'recommended', '4-6 meses', 45, NULL, NULL),
  (_couple_id, 'Pesquisar e contratar transporte', 'logistica', 'recommended', '4-6 meses', 46, NULL, NULL),
  (_couple_id, 'Planejar lua de mel', 'lua-de-mel', 'recommended', '4-6 meses', 47, NULL, NULL),
  (_couple_id, 'Contratar iluminação e som', 'decoracao', 'recommended', '4-6 meses', 48, NULL, NULL),
  (_couple_id, 'Definir o cardápio final', 'buffet', 'essential', '4-6 meses', 49, NULL, NULL),

  -- Fase 4: De 2 a 3 meses antes
  (_couple_id, 'Enviar convites oficiais', 'convites', 'essential', '2-3 meses', 50, NULL, NULL),
  (_couple_id, 'Primeira prova do vestido/traje', 'trajes', 'essential', '2-3 meses', 51, NULL, NULL),
  (_couple_id, 'Definir votos (se personalizados)', 'cerimonia', 'optional', '2-3 meses', 52, NULL, NULL),
  (_couple_id, 'Escolher alianças', 'cerimonia', 'essential', '2-3 meses', 53, NULL, NULL),
  (_couple_id, 'Planejar despedida de solteiro(a)', 'eventos', 'optional', '2-3 meses', 54, NULL, NULL),
  (_couple_id, 'Contratar cabeleireiro e maquiador', 'beleza', 'essential', '2-3 meses', 55, 'Ver profissionais', '/buscar?categoria=beleza'),
  (_couple_id, 'Fazer teste de cabelo e maquiagem', 'beleza', 'recommended', '2-3 meses', 56, NULL, NULL),
  (_couple_id, 'Comprar acessórios (sapatos, véu, etc)', 'trajes', 'recommended', '2-3 meses', 57, NULL, NULL),
  (_couple_id, 'Confirmar todos os fornecedores', 'planejamento', 'essential', '2-3 meses', 58, 'Ver fornecedores', '/meus-fornecedores'),
  (_couple_id, 'Organizar disposição das mesas', 'convidados', 'recommended', '2-3 meses', 59, 'Ir para convidados', '/convidados'),

  -- Fase 5: Último mês
  (_couple_id, 'Última prova do vestido/traje', 'trajes', 'essential', 'ultimo-mes', 60, NULL, NULL),
  (_couple_id, 'Confirmar RSVP dos convidados', 'convidados', 'essential', 'ultimo-mes', 61, 'Ir para convidados', '/convidados'),
  (_couple_id, 'Confirmar número final de convidados com buffet', 'buffet', 'essential', 'ultimo-mes', 62, NULL, NULL),
  (_couple_id, 'Reunião final com cerimonialista', 'planejamento', 'essential', 'ultimo-mes', 63, NULL, NULL),
  (_couple_id, 'Preparar roteiro da cerimônia', 'cerimonia', 'essential', 'ultimo-mes', 64, NULL, NULL),
  (_couple_id, 'Ensaio da cerimônia', 'cerimonia', 'recommended', 'ultimo-mes', 65, NULL, NULL),
  (_couple_id, 'Organizar documentação para o casamento civil', 'legal', 'essential', 'ultimo-mes', 66, NULL, NULL),
  (_couple_id, 'Preparar kit de emergência', 'logistica', 'recommended', 'ultimo-mes', 67, NULL, NULL),
  (_couple_id, 'Confirmar transporte e logística', 'logistica', 'essential', 'ultimo-mes', 68, NULL, NULL),
  (_couple_id, 'Finalizar playlist/setlist com DJ/banda', 'musica', 'recommended', 'ultimo-mes', 69, NULL, NULL),

  -- Fase 6: Última semana
  (_couple_id, 'Confirmar horários com todos os fornecedores', 'planejamento', 'essential', 'ultima-semana', 70, NULL, NULL),
  (_couple_id, 'Separar e organizar todos os pagamentos finais', 'orcamento', 'essential', 'ultima-semana', 71, 'Ir para orçamento', '/orcamento'),
  (_couple_id, 'Embalar malas para lua de mel', 'lua-de-mel', 'recommended', 'ultima-semana', 72, NULL, NULL),
  (_couple_id, 'Fazer spa/relaxar', 'beleza', 'optional', 'ultima-semana', 73, NULL, NULL),
  (_couple_id, 'Preparar gorjetas e agradecimentos', 'planejamento', 'optional', 'ultima-semana', 74, NULL, NULL),

  -- Fase 7: Dia do casamento
  (_couple_id, 'Café da manhã leve e hidratação', 'dia-do-casamento', 'recommended', 'dia-do-casamento', 75, NULL, NULL),
  (_couple_id, 'Cabelo e maquiagem', 'dia-do-casamento', 'essential', 'dia-do-casamento', 76, NULL, NULL),
  (_couple_id, 'Verificar se alianças estão com padrinho', 'dia-do-casamento', 'essential', 'dia-do-casamento', 77, NULL, NULL),
  (_couple_id, 'Entregar cronograma final ao cerimonialista', 'dia-do-casamento', 'essential', 'dia-do-casamento', 78, NULL, NULL),
  (_couple_id, 'Aproveitar cada momento!', 'dia-do-casamento', 'essential', 'dia-do-casamento', 79, NULL, NULL);
END;
$function$;
