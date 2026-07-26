# Plano de ajustes — execução em 6 fases

Escopo: 20+ ajustes agrupados. Cada fase é auto-contida e pode ser aprovada/pausada individualmente. Tudo em pt-BR.

## Fase 0 — Infra de e-mail (pré-requisito)

Configura o domínio de envio e a fila transacional que várias fases usam (reservas, CRM "Lembrar", convites de vaga).

- Abrir diálogo de setup do domínio de e-mail (você precisará informar um domínio próprio; DNS pode propagar em paralelo).
- Rodar `setup_email_infra` (cria filas pgmq, log, supressão, cron).
- Scaffold de auth templates e transacional (`send-transactional-email` + templates React Email com identidade Casamenteiro).
- Deploy das edge functions de e-mail.

Entregável: qualquer código posterior pode chamar `send-transactional-email` com `templateName` + `templateData`.

## Fase 1 — Módulo Profissional (Vagas)

### 1.1 Painel `/profissional/painel`
Nova página com abas:
- **Meu perfil**: editar `staff_profiles` (nome, funções, cidade, foto, valor/hora, bio).
- **Vagas disponíveis**: listar `staff_jobs` públicas abertas compatíveis (função + cidade + data livre).
- **Meus convites**: `staff_applications` onde ele é convidado — aceitar/recusar com prazo.
- **Meus trabalhos**: aceitos e concluídos, com botão de avaliar fornecedor quando concluído.
- **Agenda**: gestão de indisponibilidades (ver 1.4).

### 1.2 Notificações de convite
Trigger DB em `staff_applications`:
- ao criar convite → notificação in-app + `send-transactional-email` "novo convite".
- ao aceitar/recusar → notifica o fornecedor (in-app + e-mail).
- cron diário: convites com `expira_em < now + 24h` e sem resposta → e-mail "seu convite expira em breve".

### 1.3 Avaliação mútua pós-conclusão
- Só habilitar quando `staff_applications.status = 'concluido'`.
- Fornecedor avalia profissional (já existe `staff_reviews`), profissional avalia fornecedor (mesma tabela com `autor_tipo='profissional'`).
- Card no dashboard dos dois lados mostrando "avaliações pendentes".

### 1.4 Indisponibilidades
- Aba "Agenda" no painel do profissional usando `staff_unavailability`.
- Calendário mensal com bloqueio por clique + motivo opcional.
- Ao aceitar vaga, trigger já bloqueia (existe). Adicionar validação inversa: convite para data bloqueada aparece como "indisponível" na busca.

### 1.5 Busca avançada de profissionais (para o fornecedor)
Na aba "Equipe e vagas" → "Buscar profissionais":
- Filtros: múltiplas funções (chips), cidade + raio, faixa de valor/hora, rating mínimo.
- Ordenação: relevância, mais próximos, melhor avaliados, menor valor.
- Paginação (20/página) com `range()`.

### 1.6 Erros amigáveis + auditoria de publicação
- `PublishJobDialog`: catch de erro Postgres → mapear códigos comuns ("column X does not exist" → "Campo X não existe, contate o suporte").
- Adicionar `criado_por_user_id` e `published_at` em `staff_jobs` (agora sim), logar em `admin_audit_log` no insert via trigger.

### 1.7 Admin de vagas
Nova página `/admin/vagas`:
- Lista todas as vagas com status (rascunho/publicada/preenchida/expirada).
- Filtros por fornecedor, cidade, data.
- Ações: bloquear vaga, forçar expiração, ver candidaturas.
- Sob flag existente + `has_role admin`.

## Fase 2 — Reservas de datas ociosas

### 2.1 E-mails transacionais
Templates: `reserva-solicitada` (fornecedor), `reserva-confirmada` (casal+fornecedor), `reserva-recusada` (casal), `reserva-expirada` (ambos). Dispara nos triggers/UPDATE de `idle_date_reservations`.

### 2.2 Cron de expiração
Edge function `reservas-cron` agendada via pg_cron (a cada hora):
- `UPDATE idle_date_reservations SET status='expirada' WHERE status IN ('solicitada','pre_reservada') AND expira_em < now()`.
- Libera `supplier_promo_dates` (marcar `disponivel=true`).
- Envia e-mails de expiração.

### 2.3 Auditoria /admin/reservas
Estender `AdminReservations.tsx` com:
- Drawer por reserva mostrando timeline de eventos (nova tabela `reservation_events`: reservation_id, tipo, ator, payload, created_at) preenchida por trigger em cada mudança de status/taxa.

## Fase 3 — CRM Fornecedor & Orçamentos

### 3.1 E-mail no "Lembrar"
Botão "Lembrar" em `SupplierLeadsCRM` passa a chamar `send-transactional-email` template `lembrete-orcamento` além da notificação in-app.

### 3.2 Histórico por lead
Nova tabela `lead_events` (quote_id, supplier_id, tipo: 'lembrete'|'nota'|'retomar_em', payload, created_at). Timeline exibida no `LeadNoteDialog` (aba "Histórico").

### 3.3 Paginação + busca rápida no CRM
- Debounced search já existe; adicionar paginação client-side (20/página) e ordenação persistida.
- Manter filtros por status/categoria/urgência.

### 3.4 Aba "Contratados" / "Em andamento" no casal
Em `MySuppliers.tsx` / `PlanKanban`: adicionar sub-abas
- **Em andamento** (`kanban_status IN ('em_orcamento','negociando')`)
- **Contratados** (`status='contracted'`)
- **Descartados**

### 3.5 Badge de Orçamentos desktop/mobile
Auditar `SupplierSidebar` e `SupplierMobileTabBar`: recalcular contagem via mesma fonte (leads com `statusFlow='aguardando'`) em ambos os layouts.

## Fase 4 — Casal (Convidados, PDF, Orçamento)

### 4.1 Convidado casal/família com total de pessoas
`AddGuestDialog`:
- Novo campo `tipo_convite`: individual | casal | família.
- Se casal/família: campo dinâmico com nome de cada pessoa (array).
- Coluna `total_pessoas` em `wedding_guests` (calculada); usar no PDF e nas contagens.

### 4.2 Pré-visualização e histórico de PDF
- `GuestListPdfDialog`: adicionar preview (iframe do blob PDF antes do download) e toggle alfabético / por mesa / ambos.
- Nova tabela `guest_list_pdf_log` (couple_id, user_id, tipo, created_at) e tela "Histórico" acessível pelo mesmo diálogo.

### 4.3 Divergência de orçamento no plano ativo
Investigar `WeddingBudget` vs `MeuPlano`:
- Rastrear: uma soma usa `budget_items.estimated_cost`, outra usa `simulated_budgets.resultado`. Padronizar em uma função `getPlanBudget(coupleId)` em `src/lib/budgetSource.ts` e consumir nos dois lugares.
- Marca de "fonte: plano" vs "fonte: manual" visível ao usuário.

## Fase 5 — Admin

### 5.1 Login-como (impersonation real)
- Edge function `admin-impersonate` (verify_jwt=true, checa `has_role admin`) que emite session via `supabase.auth.admin.generateLink` ou `signInWithOtp` para o `target_user_id`.
- Front: em `/admin/usuarios`, botão "Entrar como" → chama function → grava sessão no cliente → redireciona para painel do papel do alvo.
- Banner fixo "Você está vendo como X — sair" (limpa sessão e restaura via token do admin guardado em `sessionStorage`).
- Log em `admin_audit_log` (action='impersonate', target_user_id, iniciado_em, encerrado_em).

## Detalhes técnicos

- **Migrations**: `staff_jobs` (add `criado_por_user_id`, `published_at`), `reservation_events`, `lead_events`, `guest_list_pdf_log`, `wedding_guests.total_pessoas` + `tipo_convite` + `pessoas jsonb`. GRANTs + RLS em cada uma.
- **Edge functions novas**: `reservas-cron`, `admin-impersonate`, `staff-invite-expiry-cron`. Templates React Email em `_shared/transactional-email-templates/`.
- **Feature flags**: reaproveitar `vagas`, `crm_fornecedor`, `reserva_datas_ociosas`; nova `admin_impersonation` (essencial=false, enabled=true).
- **Ordem sugerida de aprovação**: Fase 0 → 1 → 2 → 3 → 4 → 5. Pode reordenar 2/3/4 sem impacto.

## Fora do escopo (confirmar depois)

- Envio via WhatsApp (você citou "e-mail e/ou WhatsApp") — mantido só e-mail nesta rodada; WhatsApp exige connector (ex.: GatewayAPI/Twilio) que podemos adicionar como fase extra.
- Split de pagamento Mercado Pago para reservas (segue stub como já combinado).
