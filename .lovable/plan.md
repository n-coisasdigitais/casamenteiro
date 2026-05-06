
## Ajustes do plano, convites e orçamento

### 1. Erro "duplicate key … couple_suppliers" ao salvar plano
- `src/lib/simulador.ts` (`criarPlano`): deduplicar `csRows` por `supplier_id` e usar `upsert({ onConflict: "couple_id,supplier_id" })` em vez de `delete + insert`. Tratar erro `23505` como sucesso (idempotente). Causa raiz: o mesmo fornecedor aparece em mais de uma categoria do plano e/ou cliques duplos no botão.

### 2. Modal "Pedir orçamento" abrindo atrás do mapa
- `src/index.css`: adicionar regras forçando `z-index` baixo nos panes do Leaflet (eles usam até 700, sobrepondo o `Dialog` do Radix que é `z-50`):
  ```css
  .leaflet-pane, .leaflet-top, .leaflet-bottom, .leaflet-control { z-index: 1 !important; }
  ```

### 3. Pré-preencher form de orçamento com dados do casal
- `src/components/QuoteRequestForm.tsx`: ao abrir o Dialog, buscar `couples` e `profiles` do usuário e preencher `eventDate` (`wedding_date`), `guestCount` (`estimated_guests`) e `phone` (`contact_phone` ou do profile) quando estiverem vazios. Trocar `.single()` por `.maybeSingle()`.

### 4. Header mostra "não logado" no Explorar e quote falha
- `src/pages/Explore.tsx`: aguardar `loading` do `useAuth` antes de renderizar o header (evita flash sem user).
- `QuoteRequestForm`: se não houver `couple` carregado, mostrar CTA "Entrar para pedir orçamento" em vez de submeter.

### 5. Página de convite — calendário, RSVP e página de agradecimento
- `src/pages/InviteRSVP.tsx`: trocar o link único `.ics` por dropdown "Adicionar ao calendário" com 3 opções:
  - **Google Calendar**: URL `calendar.google.com/calendar/render?action=TEMPLATE&...`
  - **Outlook**: URL `outlook.live.com/calendar/.../deeplink/compose?...`
  - **Apple/iOS (.ics)**: blob download que abre no Calendar.
- Após confirmar/recusar, navegar para nova página `src/pages/InviteObrigado.tsx` (rota `/convite/:token/obrigado`) com mensagem de agradecimento, resumo da resposta e botão "Editar minha resposta" (volta ao `/convite/:token`, que já carrega a resposta atual).
- Disparar email de confirmação para o convidado via `email_queue` com link para editar o RSVP.

### 6. Acompanhantes — limite por convidado, contagem no painel
Migration nova:
- `wedding_guests`: `ADD COLUMN max_companions int DEFAULT 0`.
- Atualizar `respond_invite` para validar `_companions <= max_companions`.
- Atualizar `get_invite_by_token` para retornar `max_companions` e `rsvp_companions`.

Frontend:
- `src/components/AddGuestDialog.tsx`: novo campo "Pode levar quantos acompanhantes" (0–5).
- `src/pages/InviteRSVP.tsx`: limitar input de acompanhantes ao `max_companions`; ocultar quando 0.
- `src/pages/WeddingGuests.tsx`: nova coluna "Acompanhantes" mostrando `rsvp_companions / max_companions`. Total confirmados = soma de `1 + rsvp_companions` para `rsvp_status = confirmed`.

### 7. Filtros e envio em massa por email no Meus Convidados
- `src/pages/WeddingGuests.tsx`: adicionar barra de filtros (presença, grupo, tipo, status do convite — enviado/aberto/respondido).
- Quando houver seleção, novo botão **"Enviar convite por email"** que chama edge function nova `send-invite-emails` (scaffold com `email_queue` usando o domínio `avisos.www.casamenteiro.com.br`). Template em pt-BR com link `/convite/{token}`.

### 8. Orçamentos (quotes) também aparecem no Orçamento
- `src/pages/WeddingPlan.tsx` / `src/components/plan/BudgetTab.tsx`: carregar `quotes` do casal e, para cada quote sem `couple_supplier` correspondente, exibir uma linha "virtual" no orçamento com status inicial "Em orçamento". Botão "Adicionar ao plano" promove o quote para `couple_suppliers`.

### 9. Plano respeita as categorias selecionadas no simulador
- Migration: `home_simulacoes ADD COLUMN categorias_selecionadas text[]`.
- `src/lib/simulador.ts` (`calcularSimulacao`): aceitar `categoriasSelecionadas?: string[]`. Quando informado, filtrar `budget_distribution_defaults` apenas para essas categorias e redistribuir percentuais proporcionalmente para somar 100%.
- `src/pages/Simulador.tsx`: persistir a seleção do passo de categorias em `home_simulacoes.categorias_selecionadas` e passar adiante.

### 10. Cor do texto em containers verdes (legibilidade)
- `src/index.css`: dentro de containers verdes (cards/banners do plano e dos forms com `--color-primary` / `--color-accent`), forçar `color: white` para textos `muted-foreground`, labels e placeholders. Ajustar utilitário Tailwind via classe `.on-green` aplicada nesses blocos.

### 11. Ajustar orçamento sem regerar a simulação
- `src/pages/Simulador.tsx`: ao re-simular vindo de uma simulação existente, fazer `UPDATE` do registro em `home_simulacoes` em vez de `INSERT` (corrige a duplicação que gerou 4 simulações).
- `src/pages/SimuladorResultado.tsx`: novo botão "Ajustar orçamento" inline, que chama `recalcularSimulacao` e atualiza o registro atual; **não navega** para nova rota.

### 12. Ajuste de verba por categoria + seleção de fornecedores ao assumir
- `src/lib/simulador.ts`: nova função `recalcularCategoria(resultado, catSlug, novaVerba)` que reprocessa apenas os fornecedores daquela categoria com a verba ajustada e atualiza o total/redistribui.
- `src/pages/SimuladorResultado.tsx`: na seção de cada categoria com cobertura insuficiente, botão "Ajustar verba desta categoria" (input + slider) — processa só aquela seção, sem recarregar a página.
- Em cada card de fornecedor sugerido, checkbox "Incluir no plano". `criarPlano` passa a aceitar `Set<supplierId>` opcional; quando vazio, mantém comportamento atual.

## Arquivos
**Editar:** `src/lib/simulador.ts`, `src/index.css`, `src/components/QuoteRequestForm.tsx`, `src/pages/Explore.tsx`, `src/pages/InviteRSVP.tsx`, `src/pages/WeddingGuests.tsx`, `src/components/AddGuestDialog.tsx`, `src/components/plan/BudgetTab.tsx`, `src/pages/WeddingPlan.tsx`, `src/pages/SimuladorResultado.tsx`, `src/pages/Simulador.tsx`, `src/App.tsx`.

**Criar:** `src/pages/InviteObrigado.tsx`, `supabase/functions/send-invite-emails/index.ts` (+ `deno.json`), uma migration adicionando `max_companions`, `categorias_selecionadas` e atualizando `respond_invite` / `get_invite_by_token`.
