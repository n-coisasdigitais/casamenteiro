## Escopo e abordagem

Lista enorme e multi-domínio. Vou entregar em **8 fases independentes**, cada uma testável isoladamente, para você aprovar/pausar entre elas. Cada fase abaixo lista o que entra e a ordem de execução.

---

### Fase 1 — Correção crítica do cadastro profissional
- Rodar `SELECT DISTINCT account_type FROM profiles` antes da migration para não perder valores em uso.
- Migration: recriar `profiles_account_type_check` incluindo `couple`, `supplier`, `profissional`, `admin` + o que aparecer no distinct.
- Auditar `prevent_role_conflict`, `admin_broadcast_notification`, `admin_broadcast_segmented`, `handle_new_user` e RLS para garantir que `profissional` não seja bloqueado.
- Teste ponta a ponta: signup → confirmação → onboarding → painel.

### Fase 2 — Profissional como conta de 1ª classe
- Novo tipo de conta próprio (não reaproveita layout de casal): header/menu dedicado, sem abas de Casamento/Convidados/Orçamento.
- Perfil público em `/profissional/:categoria/:slug` (SEO + JSON-LD `Person`), separado do `/vagas/:slug` atual.
- Verificação de documentos: upload de RG/CNH + selfie, coluna `documento_status` (`pendente|aprovado|reprovado`), publicação bloqueada até aprovação, aba admin em `/admin/vagas` para revisar.
- E-mail de novas vagas compatíveis (função + cidade + raio) via `send-transactional-email` + cron horário.
- Ativar flag `vagas` e liberar navegação pública ("Sou prestador").

### Fase 3 — Segurança, auditoria e mensagens de erro
- Estender `admin_audit_log` para cobrir: exclusões, envio de convites, reservas (create/accept/expire), aceites de vaga, mudanças de plano, login de admin. Trigger genérico + inserts nas edge functions.
- Nova página `/admin/auditoria` estilo Notion: filtros por ação, tabela, usuário, data; export CSV.
- Bloquear signup com e-mail já existente antes da chamada Supabase (checar via RPC `email_disponivel`) + mensagem clara.
- Investigar por que confirmação de e-mail não chega (checar template + hook + logs `email_send_log`).
- Varredura em `src/lib/authErrors.ts` + toasts do app para traduzir todos os erros Supabase remanescentes.
- Rodar `security--run_security_scan` no fim e corrigir findings.

### Fase 4 — Perfil público do casal + indicações
- Corrigir roteamento de `/casais/:slug` quando logado (bug de redirect para Home — provável guard em `AuthContext`/`App.tsx`).
- Corrigir `/i/:codigo` (`CapturarIndicacao`) para levar a `/cadastro?ref=…` com banner "Fulano te indicou".
- Slider de fotos no perfil do casal (embla-carousel já disponível).
- Botão "Enviar mensagem" funcional → cria thread em `couple_messages` + notifica in-app + e-mail.
- Avaliações do casal sobre a plataforma (`platform_reviews` nova tabela) exibidas em Home/perfil com toggle no admin.
- Copy mais afetiva na página de indicações.
- Desconto de indicação (50% 1º mês configurável em `platform_prices` como `desconto_indicacao_pct` / `_valor`), aplicado no checkout de assinatura.

### Fase 5 — Melhorias do fluxo do Casal
- Notificação de novas mensagens: push (se logado), badge no sino, e-mail transacional (padrão OLX).
- Após 1ª mensagem do casal, disparar e-mail ao fornecedor com CTA "ver dados do cliente".
- Tag "no seu plano/orçamento" no card e no perfil do fornecedor quando `couple_suppliers` já existe.
- Convite: abrir/editar/cancelar direto na lista.
- `wedding_guests.pessoas` (jsonb) já existe — mudar `AddGuestDialog` e listagem para permitir tipo por pessoa (adulto/criança) quando família, em vez de tipo único no convite.

### Fase 6 — Melhorias do fluxo do Fornecedor
- Remover do painel do fornecedor as rotas de casal (Casamento, Convidados, Tarefas etc.) — guard por `account_type`.
- Gerenciar vagas: publicar, despublicar, editar (`SupplierStaffTab`).
- Relatório PDF de tarefas do casal (concluídas × pendentes × prazo) substituindo `window.print`.
- Refatorar "Adicionar fornecedor fora da plataforma": manter no mesmo Kanban com tag `externo`, permitir marcar como pago sem regredir de status. Revisar transições do Kanban de negociação (fornecedor↔casal).
- Métricas por fornecedor (visitas, leads, conversão, tempo de resposta).
- Avaliações: incluir avaliações de prestadores no painel do fornecedor, exibidas separadas + agregado, sempre com comentário.

### Fase 7 — Home, menu e ajustes gerais
- Home: adicionar todos os novos serviços (vagas, prestadores, importação iCasei/Casar, corretagem), planos com valores da tabela `platform_prices`, seções "Sou fornecedor / prestador / casal", CTA público "Explorar vagas" (candidatura exige login).
- Menu principal reorganizado com esses eixos.
- Corrigir barra de demo sobrepondo menus/botão fechar (z-index + safe-area).
- Guided tour por tipo de conta (react-joyride) com passos diferentes para casal, fornecedor, prestador, admin.
- Corrigir sobreposição de destaques no relatório de convidados PDF.
- Admin: filtros/status/datas em `/admin/reservas`, `/admin/corretagem`, `/admin/indicacoes`, `/admin/usuarios` (estilo Notion — filtros persistidos na URL). Reenviar senha por e-mail em `/admin/usuarios`. Traduzir rótulos de tipo de usuário. Métricas + filtros em `/admin/simulacoes`.
- Cupons e presentes de assinatura: tabela `subscription_coupons` (percentual/valor/meses grátis) + aplicação no checkout.

### Fase 8 — Mercado Pago real (destrava a corretagem e libera assinaturas)
- Secrets `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` via `add_secret`.
- **Assinaturas** (flag `assinaturas`, off por padrão):
  - Migration `subscription_plans` (seed grátis/profissional/destaque com `mp_plan_id` vazio) + `supplier_subscriptions`.
  - Edge function `mp-subscription-create` → cria preapproval, devolve `init_point`.
  - Edge function `mp-subscription-webhook` → processa eventos preapproval/payment, atualiza status, reflete `suppliers.featured` para destaque.
  - Trial de 30 dias no cadastro.
  - Frontend: `/fornecedor/planos` (3 cards, meio destacado) + card "Plano atual" no painel.
- **Corretagem real** (flag `corretagem_datas_ociosas`):
  - Substituir stub em `mp-checkout-split` por `POST /checkout/preferences` com `marketplace_fee = comissao_plataforma` e `collector_id = suppliers.mp_account_id`.
  - Substituir stub em `mp-webhook` por validação de assinatura + `GET /v1/payments/:id`; ao `approved` confirma reserva, bloqueia data, insere em `commission_ledger`.
- **Contrato de corretagem**: nova página no painel do fornecedor e do casal para visualizar/baixar o rascunho + notificação in-app + e-mail quando gerado.
- **`/admin/corretagem`**: export CSV/PDF dos lançamentos + timeline de auditoria (`commission_ledger_events` novo).

---

## Detalhes técnicos

- **Ordem de execução recomendada:** 1 → 3 → 2 → 4 → 5 → 6 → 7 → 8. Fase 1 é bloqueante para 2. Fase 3 vale a pena vir cedo para termos auditoria enquanto o resto muda. Fase 8 depende de você entregar `MP_ACCESS_TOKEN` e liberação jurídica.
- **Flags novas:** `assinaturas`, mantém `vagas` e `corretagem_datas_ociosas`.
- **Tabelas novas:** `platform_reviews`, `subscription_plans`, `supplier_subscriptions`, `subscription_coupons`, `commission_ledger_events`, colunas `documento_url`/`documento_status`/`documento_selfie_url` em `staff_profiles`.
- **Edge functions novas:** `mp-subscription-create`, `mp-subscription-webhook`, `staff-job-match-cron` (e-mail de vaga compatível), `email-disponivel`.
- **RLS/Grants:** cada tabela nova segue o padrão do projeto (grants explícitos + policies + `has_role`).
- **Não incluído no plano:** WhatsApp (fora de escopo até você confirmar API/gateway); reformulação completa da Home (só entra "adicionar novos serviços e planos"), a reformulação total fica para uma fase própria quando você definir o novo layout.

## Perguntas antes de começar

1. Confirma a ordem 1→3→2→4→5→6→7→8, ou prefere outra?
2. Alguma fase que quer partir em cards separados ou pular agora?
3. Para Fase 8, você já consegue providenciar `MP_ACCESS_TOKEN` (sandbox serve) para eu ir plugando, ou entrego só o código pronto atrás da flag?
