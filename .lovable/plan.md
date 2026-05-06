Vou corrigir os ajustes em duas frentes: primeiro estabilizar os erros que ainda impedem o uso do plano/orçamento, depois completar os fluxos de convites, RSVP e experiência visual.

## 1. Corrigir definitivamente o erro ao salvar o plano

O erro anexado indica conflito em `couple_suppliers` para o mesmo casal e fornecedor. Mesmo com `upsert` no frontend, vou tornar a criação do plano idempotente e segura no banco:

- Criar/ajustar uma função segura de backend para salvar o plano do casal.
- Antes de adicionar fornecedor ao plano, verificar se já existe `couple_id + supplier_id`.
- Se existir, atualizar os dados relevantes em vez de inserir novamente.
- Se não existir, inserir.
- Deduplicar fornecedores repetidos entre categorias antes de salvar.
- Tratar o erro `23505` como operação já existente quando for seguro.
- Garantir que clicar várias vezes em “Criar meu plano” não gere duplicados nem múltiplas simulações.

Arquivos principais:
- `src/lib/simulador.ts`
- `src/pages/SimuladorResultado.tsx`
- nova migration para função de backend/idempotência, se necessário

## 2. Modal de contato com fornecedor atrás do mapa

Vou ajustar o conflito de `z-index` entre Leaflet/OpenStreetMap e os modais:

- Rebaixar `z-index` dos elementos Leaflet (`.leaflet-pane`, `.leaflet-control`, `.leaflet-top`, `.leaflet-bottom`).
- Garantir que `Dialog`, popovers e overlays fiquem acima do mapa.
- Conferir se isso não quebra os controles do mapa.

Arquivo:
- `src/index.css`

## 3. Formulário de contato com fornecedor preenchido com dados do casal

No formulário “Pedir orçamento”:

- Buscar os dados do casal logado com `.maybeSingle()`.
- Preencher automaticamente, quando existirem:
  - telefone
  - data do casamento
  - número de convidados
- Manter campos editáveis para o cliente ajustar.
- Se o usuário estiver deslogado, mostrar CTA claro para entrar/cadastrar antes de gerar orçamento.

Arquivos:
- `src/components/QuoteRequestForm.tsx`
- possivelmente `src/pages/SupplierProfile.tsx`

## 4. Header da exploração mostrando usuário deslogado

Vou corrigir o estado de autenticação na página de exploração:

- Esperar o carregamento do contexto de autenticação antes de renderizar o header.
- Evitar mostrar “Entrar” enquanto a sessão ainda está carregando.
- Garantir que, logado, o orçamento seja criado vinculado ao casal correto.

Arquivos:
- `src/pages/Explore.tsx`
- componentes de header usados nessa página, se houver

## 5. Envio de convites por email na página de convidados

Vou completar o fluxo para selecionar convidados e enviar convite por email:

- Adicionar seleção múltipla de convidados.
- Botão “Enviar convite por email”.
- Validar convidados sem email e avisar quais não podem receber.
- Chamar a função de backend de envio de convites.
- Atualizar `sent_at`/status visual após envio.
- Mostrar feedback em português.

Arquivos:
- `src/pages/WeddingGuests.tsx`
- `supabase/functions/send-invite-emails/index.ts`
- email queue existente

## 6. Página pública do convite com calendário funcional

Vou substituir o “add ao meu calendário” atual por opções úteis:

- Google Calendar.
- Outlook/Office 365.
- Apple/iOS via arquivo `.ics`.
- Gerar título, data, horário, local e descrição corretamente.
- Usar dados do casamento quando disponíveis.

Arquivo:
- `src/pages/InviteRSVP.tsx`

## 7. Página de agradecimento após confirmar presença

Após confirmar presença:

- Redirecionar para uma página de agradecimento.
- Mostrar resumo da resposta.
- Oferecer botão para “Alterar minha resposta”.
- Manter o token do convite para o convidado conseguir ajustar depois.
- Enviar confirmação por email quando houver email do convidado.

Arquivos:
- `src/pages/InviteObrigado.tsx`
- `src/pages/InviteRSVP.tsx`
- `src/App.tsx`
- função/email queue, se precisar ajustar template

## 8. Acompanhantes e limite por convidado

Vou ajustar o comportamento para diferenciar convidado principal e acompanhantes:

- Mostrar no sistema quantas pessoas o convidado confirmou no total.
- Exibir “+ 1 acompanhante”, “+ 2 acompanhantes” etc.
- Permitir definir limite de acompanhantes por convidado no cadastro/edição.
- No RSVP, bloquear resposta acima do limite definido.
- Se o convite for individual, limitar em 0.
- Se for casal, permitir 1 acompanhante, ou outro número configurado.

Arquivos:
- `src/components/AddGuestDialog.tsx`
- `src/pages/WeddingGuests.tsx`
- `src/pages/InviteRSVP.tsx`
- migration/funções `get_invite_by_token` e `respond_invite`, se o backend atual ainda não estiver consistente

## 9. Orçamentos também aparecerem na aba Orçamento

Hoje os orçamentos aparecem no dashboard, mas precisam aparecer também no orçamento como status inicial.

Vou ajustar para:

- Carregar solicitações da tabela de orçamentos/quotes.
- Criar linhas virtuais no orçamento quando ainda não existir fornecedor no plano.
- Exibir status inicial como “Em orçamento” ou equivalente em português.
- Evitar duplicar item quando já houver `couple_supplier` ou `budget_item` relacionado.

Arquivos:
- `src/pages/WeddingPlan.tsx`
- `src/components/plan/BudgetTab.tsx`

## 10. Filtros na página de convidados

Vou adicionar filtros úteis:

- Todos / confirmados / recusados / aguardando.
- Por grupo.
- Por tipo de convidado, se houver esse dado.
- Busca por nome/email.
- Contadores por status.

Arquivo:
- `src/pages/WeddingGuests.tsx`

## 11. Plano respeitar categorias escolhidas pelo cliente

O simulador deve montar plano apenas com as categorias selecionadas.

Vou ajustar:

- `calcularSimulacao` para receber categorias selecionadas.
- Redistribuir o orçamento proporcionalmente apenas entre essas categorias.
- Persistir categorias selecionadas na simulação.
- Ao carregar resultado salvo, manter exatamente as categorias escolhidas.
- Não adicionar categorias extras ao plano.

Arquivos:
- `src/lib/simulador.ts`
- `src/pages/Simulador.tsx`
- `src/pages/SimuladorResultado.tsx`
- migration para `home_simulacoes.categorias_selecionadas`, se necessário validar/aplicar corretamente

## 12. Textos cinza em áreas verdes

Vou melhorar contraste nas áreas verdes:

- Textos auxiliares em branco ou branco com opacidade.
- Labels e placeholders legíveis.
- Aplicar uma classe utilitária específica para containers verdes, evitando afetar a plataforma toda.

Arquivo:
- `src/index.css`
- componentes verdes pontuais, se precisarem da classe

## 13. Reprocessar orçamento sem criar nova simulação

No resultado do plano:

- Quando o cliente aumentar o orçamento, atualizar a simulação existente com `UPDATE`.
- Não criar uma nova linha em `home_simulacoes`.
- Recalcular visualmente e persistir o novo resultado no mesmo `id`.
- Desabilitar botões enquanto estiver recalculando para evitar múltiplos cliques.

Arquivos:
- `src/lib/simulador.ts`
- `src/pages/SimuladorResultado.tsx`

## 14. Ajustar orçamento por categoria e escolher fornecedores assumidos

Quando uma categoria não bater com o orçamento:

- Mostrar ação “Ajustar orçamento desta categoria”.
- Permitir informar nova verba daquela categoria.
- Recalcular somente aquela categoria, sem remontar a página toda.
- Atualizar o total do orçamento e a distribuição no resultado atual.
- Permitir selecionar quais fornecedores serão assumidos no plano.
- Na criação do plano, salvar apenas os fornecedores selecionados.
- Ainda criar itens de orçamento por categoria para o casal acompanhar.

Arquivos:
- `src/lib/simulador.ts`
- `src/pages/SimuladorResultado.tsx`

## Observações técnicas importantes

- Vou manter todo texto e feedback em português do Brasil.
- Vou usar `.maybeSingle()` em consultas que retornam uma linha.
- Não vou editar manualmente os arquivos gerados da integração de backend (`src/integrations/supabase/client.ts` e `types.ts`).
- As alterações de banco serão feitas por migration.
- O fluxo de email continuará usando a infraestrutura já criada para `avisos.www.casamenteiro.com.br`.

## Resultado esperado

Depois da implementação:

- O plano não deve mais falhar com fornecedor duplicado.
- O modal de contato abrirá por cima do mapa.
- Dados do onboarding alimentarão formulários e orçamento.
- Convites poderão ser enviados por email em lote.
- RSVP terá calendário funcional, agradecimento e edição posterior.
- Acompanhantes serão controlados corretamente.
- Orçamentos aparecerão também na aba Orçamento.
- O simulador respeitará categorias escolhidas.
- Ajustes de orçamento atualizarão a mesma simulação, sem criar várias novas.
- O cliente poderá escolher quais fornecedores assumir no plano.