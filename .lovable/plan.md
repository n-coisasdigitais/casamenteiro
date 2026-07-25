
## Módulo de Vagas (Staffing) — Fornecedores + Profissionais

Novo módulo, atrás da flag `vagas` (grupo Fornecedor, `enabled=false`). Cria equipe própria do fornecedor, publicação de vagas, marketplace bilateral (feed público de vagas + perfis públicos de profissionais) e avaliação mútua. Pagamento **fora da plataforma** — apenas registro do valor.

---

### 1. Banco de dados (migration única)

**Enum novo**: adicionar `'profissional'` como possível `account_type` em `profiles`.

**Tabelas** (todas com `id uuid pk`, `created_at`, RLS + GRANTs para authenticated/service_role):

- `staff_profiles`: perfil do profissional. Campos: `user_id` (nullable — permite cadastro pelo fornecedor antes do claim), `nome`, `slug` (único, para `/profissional/:slug`), `telefone`, `foto_url`, `funcoes text[]`, `cidade`, `raio_km int`, `valor_min_turno numeric`, `bio`, `criado_por uuid`, `consentimento_lgpd bool default false`, `is_public bool default true`, `rating numeric`, `review_count int`.
- `staff_unavailability`: `staff_id`, `data date`, `motivo`. Unique (`staff_id`, `data`).
- `staff_jobs`: `supplier_id`, `funcao`, `data`, `hora_inicio`, `hora_fim`, `local`, `cidade`, `vagas int default 1`, `valor_turno numeric`, `observacoes`, `status check(aberta|preenchida|concluida|cancelada) default 'aberta'`, `is_public bool default true` (aparece no feed).
- `staff_applications`: `job_id`, `staff_id`, `origem check(convite|candidatura) default 'convite'`, `status check(convidado|candidato|aceito|recusado|expirado|concluido|no_show)`, `convidado_em`, `respondido_em`, `expira_em`. Unique (`job_id`, `staff_id`).
- `staff_reviews`: `job_id`, `autor_tipo check(fornecedor|profissional)`, `autor_id`, `avaliado_id`, `estrelas int 1..5`, `comentario`. Unique (`job_id`, `autor_tipo`).

**Funções/triggers**:
- `staff_can_view_contact(_job_id, _staff_id)` — retorna true se existe application `aceito`; usada por RPC de contato.
- Trigger em `staff_applications`: ao virar `aceito`, insere `staff_unavailability(staff_id, jobs.data, 'vaga aceita')` e move outras applications concorrentes do mesmo staff/data para `recusado`.
- Trigger em `staff_jobs`: quando `data < today` e status = `aberta|preenchida`, cron/edge marca `concluida` e libera avaliação.
- Trigger em `staff_reviews`: recalcula `rating`/`review_count` em `staff_profiles` (e algo equivalente para suppliers, se ainda não existir para essa tabela).
- `has_public_staff_profile(_staff_id)` para RLS de listagem pública.

**RLS**:
- `staff_profiles`: SELECT público quando `is_public=true` (esconde `telefone`); dono (`user_id=auth.uid()`) e `criado_por` gerenciam; admin tudo.
- `staff_jobs`: SELECT público quando `is_public=true AND status='aberta'`; supplier dono gerencia; admin tudo.
- `staff_applications`: SELECT/UPDATE pelo fornecedor dono do job, pelo profissional dono do staff (via `user_id` ou `criado_por`), admin tudo. INSERT: fornecedor cria `convite`; profissional cria `candidatura` (só se `job.is_public`).
- `staff_unavailability`: dono do staff e admin.
- `staff_reviews`: leitura pública; INSERT só se a application correspondente estiver `concluido` e o autor for parte dela.

**Máscara de contato**: view `staff_profiles_public` sem `telefone`, usada pelo feed/busca. Telefone só via RPC `get_staff_contact(_job_id)` que valida application aceita.

---

### 2. Feature flag

Inserir em `feature_flags`: `key='vagas'`, grupo `fornecedor`, `enabled=false`, `essential=false`. Rotas novas ficam em `<FlagGate flag="vagas">`. Adicionar em `FEATURE_FLAG_DEFAULTS` como `false`.

---

### 3. Cadastro do profissional (conta nova)

- Adicionar opção "Sou profissional de eventos" em `/cadastro` (atrás da flag).
- `handle_new_user` cria `staff_profiles` quando `account_type='profissional'` (com dados mínimos do meta).
- Rota `/profissional/onboarding` — coleta funções, cidade, raio, valor mínimo, foto, consentimento LGPD.
- Rota `/profissional/painel` com abas:
  - **Vagas disponíveis** (feed compatível: função ∩ cidade ∩ data livre) + candidatura.
  - **Meus convites** (aceitar/recusar; ao aceitar mostra template WhatsApp com dados do job).
  - **Minha agenda** (calendário de aceites + bloqueios manuais).
  - **Meu perfil público** (bio, foto, funções, `is_public` toggle).
  - **Avaliações recebidas**.
- `/profissional/:slug` — perfil público com bio, funções, cidade, nota, últimas avaliações. Contato mascarado (apenas botão "Convidar para uma vaga" para fornecedores logados).

---

### 4. Painel do fornecedor — aba "Equipe e vagas"

Nova aba em `SupplierDashboard.tsx`. Subabas:

1. **Minha equipe** — CRUD de `staff_profiles` com `criado_por = supplier.user_id`. Botão "Enviar convite para reivindicar perfil" (envia link com token para o profissional criar conta e vincular `user_id`).
2. **Publicar vaga** — formulário → cria `staff_jobs` (`is_public` default on = entra no feed).
3. **Buscar profissionais** — lista candidatos compatíveis:
   - Filtro: função ∈ `funcoes`, sem `staff_unavailability` na data, cidade dentro do `raio_km`, `valor_min_turno <= valor_turno`.
   - Card: foto, **nome completo**, funções, nº eventos concluídos, % comparecimento (concluídos ÷ aceitos), nota.
   - Ordenação: já-trabalhou-comigo → % comparecimento → nota.
   - Telefone/WhatsApp mascarado com tooltip "Contato liberado após o aceite".
4. **Convidar** — seleção múltipla → cria `staff_applications` `convidado` com `expira_em = min(now+24h, job.data - 48h)`.
5. **Minhas vagas** — kanban por status; ao concluir, libera avaliar cada aceito.
6. **Avaliações dadas/recebidas**.

Texto fixo em toda tela de vaga: *"O pagamento é combinado e feito diretamente entre vocês; a plataforma apenas registra o valor."*

---

### 5. Fluxo de aceite

Ao virar `aceito`:
- Trigger cria `staff_unavailability` na data.
- UI do fornecedor mostra card "Contato liberado" com telefone e botão WhatsApp (template pt-BR com função/data/horário/local/valor).
- Notificações (`notifications`) para ambas as partes.
- Se `vagas` do job forem preenchidas, status → `preenchida` e outros convites pendentes expiram.

Job cron diário (`staff-jobs-close-cron` edge function, similar ao `broadcast-cron` existente): marca jobs vencidos como `concluida`, expira convites vencidos, envia lembrete "avalie seu par".

---

### 6. Rotas e navegação

- `/profissional` (landing), `/profissional/cadastro`, `/profissional/onboarding`, `/profissional/painel`, `/profissional/vagas`, `/profissional/:slug` — todas atrás de `FlagGate flag="vagas"`.
- `UserMenu` mostra "Painel do profissional" quando `account_type='profissional'`.
- Redireciona `/painel-fornecedor?tab=vagas` para o novo módulo.

---

### 7. i18n e segurança

- Todos os textos em pt-BR.
- Validação Zod client-side em formulários (vaga, cadastro, avaliação).
- Consentimento LGPD obrigatório antes de tornar perfil público.
- Denúncia de avaliação (moderação básica) reutilizando fluxo do `admin/avaliacoes`.

---

### 8. Detalhes técnicos

**Arquivos a criar**
- Migration única (tabelas + RLS + GRANTs + triggers + `vagas` flag + `'profissional'` no enum de conta + view pública).
- Edge function `staff-jobs-close-cron`.
- `src/pages/StaffLanding.tsx`, `StaffOnboarding.tsx`, `StaffDashboard.tsx`, `StaffPublicProfile.tsx`, `StaffJobsFeed.tsx`.
- `src/components/staff/`: `MyTeamTab.tsx`, `PublishJobDialog.tsx`, `FindStaffTab.tsx`, `StaffCard.tsx`, `MyJobsKanban.tsx`, `StaffReviewsTab.tsx`, `InviteToClaimDialog.tsx`, `PaymentDisclaimer.tsx`.
- `src/lib/staff.ts` (compat + WhatsApp template + máscara de telefone).

**Arquivos a alterar**
- `src/App.tsx` (rotas novas atrás da flag).
- `src/contexts/FeatureFlagsContext.tsx` (`vagas: false`).
- `src/pages/SupplierDashboard.tsx` (nova aba "Equipe e vagas" com renderização condicional pela flag).
- `src/pages/Auth.tsx` + `CoupleOnboarding`-like fluxo para novo tipo (ou nova página `StaffOnboarding`).
- `src/components/UserMenu.tsx` (item novo).
- `AdminPanel` — item de moderação de vagas e denúncias.
- `handle_new_user` (recriada na migration) para lidar com o novo `account_type`.

**Fora do escopo**
- Pagamentos, contratos e retenção fiscal.
- Chat completo profissional↔fornecedor (usar WhatsApp após aceite).
- Recomendação por ML — só ordenação simples por histórico/nota.
- Fluxo de assinatura ou monetização do módulo.
