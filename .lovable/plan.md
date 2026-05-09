# Plano — 10 features finais

Vou entregar em **4 fases** para manter o app sempre estável. Cada fase é independente e pode ser publicada.

---

## Pré-decisões (precisam de resposta antes da Fase 2 e 4)

1. **Google Places (item 4)** — pago após cota. Posso começar **só com ViaCEP** (gratuito, busca por CEP) e adicionar Google Places depois quando você tiver a chave?
2. **OAuth Google/Outlook Calendar (item 10)** — exige criar credenciais OAuth no Google Cloud + Microsoft Azure. Posso entregar primeiro o **import .ics + bloqueio manual** (que já existe via `supplier_blocked_dates`) e deixar OAuth como Fase 5?
3. **Broadcast por WhatsApp (itens 7 e 9)** — só temos email hoje. WhatsApp exige Twilio/Z-API com chave paga. Posso restringir broadcast à plataforma + email + link `wa.me` (clique único, sem API)?

---

## Fase 1 — Cidades + Raio de atendimento (itens 1 e 2)

**Migrações**
- Nova tabela `cidades_interesse(id, cidade, estado, simulacao_id, criado_em)` com RLS (qualquer um insere; só admin lê).
- Nova tabela `cidades_coordenadas(cidade pk, estado, lat, lng)` populada com top 50 cidades de MG.
- `ALTER suppliers ADD cidades_atendidas jsonb DEFAULT '[]', raio_atendimento_km int DEFAULT 0, lat numeric, lng numeric`.
- View/RPC `cidades_disponiveis(prefix text)` retornando `DISTINCT city` dos suppliers approved.

**Frontend**
- Componente `<CityAutocomplete>` reutilizável (debounce 250ms, dropdown com cards, opção "📍 Continuar com X mesmo assim").
- `Simulador.tsx` (passo 3): substituir input por `<CityAutocomplete>`. Se cidade sem fornecedor → grava em `cidades_interesse` + flag para mostrar aviso na tela de resultado.
- `SimuladorResultado.tsx`: aviso âmbar quando flag setada + busca expandida (cidade exata → `cidades_atendidas` ILIKE → mesmo estado dentro do raio via Haversine no cliente).
- Onboarding e painel do fornecedor: nova seção **"Onde você atende?"** com chips de cidades + toggle de raio (slider 10-300km).
- `src/lib/simulador.ts` `buscarFornecedores()`: incluir match por `cidades_atendidas` e por raio (Haversine usando `cidades_coordenadas`).

**Admin**
- Nova rota `/admin/cidades` com lista ordenada por frequência, badge se ≥3 buscas sem fornecedor, botão "Marcar como atendida".

---

## Fase 2 — Controle de contas + Convites melhorados (itens 3, 4, 5, 6)

**Item 3 — Um e-mail, um papel**
- `profiles.account_type` já existe (`couple|supplier`). Adicionar trigger `prevent_role_conflict` que bloqueia signup se e-mail já existe com outro `account_type` (via lookup em `auth.users` + `profiles`).
- `Auth.tsx`: ao errar com mensagem específica, mostrar erro inline com botão "Fazer login →". Login unificado já existe; só ajustar redirect: couple → `/dashboard`, supplier → `/fornecedor/painel`, admin → `/admin`.

**Item 4 — Mapa no convite**
- `ALTER couples ADD local_nome, local_endereco, local_lat numeric, local_lng numeric, local_cep text` (cerimônia e recepção compartilham os campos atuais; criar pares `ceremony_*` e `reception_*`).
- Componente `<EnderecoPicker>` com 2 abas: **CEP (ViaCEP)** + **Busca livre** (placeholder Google Places quando você decidir).
- `InviteRSVP.tsx`: bloco de localização com iframe Google Maps embed + botões "Como chegar" (Google Maps / Waze).

**Item 5 — Expiração + lembretes**
- `ALTER couples ADD invite_deadline date, invite_expired boolean DEFAULT false`.
- Nova tabela `convite_lembretes(id, couple_id, data_envio, tipo, enviado, enviado_em)`.
- UI no editor de convite: date picker do prazo + toggle "lembretes" + 1-3 selects de dias antes + preview da data.
- Edge function `convite-cron` (executa diário via pg_cron): expira convites + envia lembretes pendentes via fila de email já existente.
- `InviteRSVP.tsx`: banner "Prazo encerrado" se `invite_expired`.

**Item 6 — Mídia do convite**
- `ALTER couples ADD invite_media_type text DEFAULT 'foto', invite_video_url, invite_album jsonb DEFAULT '[]', invite_album_autoplay boolean, invite_album_interval int DEFAULT 5`.
- Novo bucket público `convite-midias`.
- Editor: radio com 3 tipos (foto / vídeo / álbum). Vídeo: validar URL YouTube + extrair `video_id`. Álbum: upload múltiplo (max 10, max 1MB cada, validação client-side, drag-to-reorder).
- `InviteRSVP.tsx`: render condicional (foto, iframe YouTube `?autoplay=1&mute=1`, ou carrossel shadcn com setas/dots/autoplay).

---

## Fase 3 — Broadcast com gatilhos + Kanban "Fora da plataforma" (itens 7 e 8)

**Item 7 — Gatilhos automáticos**
- Nova tabela `broadcast_gatilhos(id, tipo, dias_antes int, template_mensagem text, canal text, ativo boolean)`.
- Seed inicial dos 6 gatilhos (data_casamento, vencimento_parcela, mes_que_falta, 6_meses_antes, prazo_confirmacao, fornecedor_aprovado).
- Página `/admin/comunicacao` ganha aba **"Gatilhos automáticos"**: lista com toggle ativo, slider dias antes, editor de template com chips de variáveis clicáveis, preview com dados fictícios.
- Edge function `broadcasts-cron` (diária): para cada gatilho ativo busca registros com `data − dias_antes = hoje`, renderiza template, enfileira email + grava `broadcast_history`.

**Item 8 — Kanban "Fora da plataforma"**
- Adicionar `'fora_da_plataforma'` à coluna `kanban_status` (já é text livre).
- `ALTER couple_suppliers ADD external_supplier_name text, external_contracted_at date, external_notes text`.
- `PlanKanban.tsx`: nova coluna cinza neutra; ao soltar card lá, abrir modal pedindo nome livre + valor (obrigatórios) + data + obs. Card mostra badge "Fora da plataforma".
- `BudgetTab.tsx` / função de projeção: tratar `fora_da_plataforma` como `contratado` no cálculo.
- `AdminFinance.tsx`: cards separados "Na plataforma" vs "Fora da plataforma" (oportunidade perdida).

---

## Fase 4 — Envio em massa + Agenda do fornecedor (itens 9 e 10)

**Item 9 — Envio em massa**
- Nova tabela `quotes_enviados(id, couple_id, supplier_id, canal, mensagem, enviado_em, respondido, respondido_em)`.
- Em `SimuladorResultado.tsx` e `BudgetTab.tsx`: checkbox em cada card (aparece no hover, borda terracota quando marcado), checkbox "selecionar todos" + contador.
- Barra fixa bottom (`#2C2420` / branco) com 2 botões:
  - **📧 Plataforma**: modal de preview do template editável (admin pode editar default em `/admin/configuracoes`), envia 1 quote por fornecedor + cria `couple_suppliers` em `em_orcamento` se não existir + grava `quotes_enviados`.
  - **💬 WhatsApp**: modal lista fornecedores com botões `wa.me` pré-formatados; após clique, persiste "✓ Enviado" no `localStorage` + grava `quotes_enviados` com canal whatsapp.

**Item 10 — Agenda do fornecedor**
- Tabela existente `supplier_blocked_dates` recebe `origem text DEFAULT 'manual'` (manual | google | outlook | ics).
- Painel do fornecedor → seção "Agenda" com 4 abas:
  - **Manual** (já existe via `AvailabilityCalendar`).
  - **Google Calendar**: botão "Conectar" via `lovable.auth.signInWithOAuth("google", { extraParams: { scope: "calendar.readonly" } })` + edge function `sync-google-calendar` (24h).
  - **Outlook**: idem, requer setup de OAuth Microsoft (vou pedir as credenciais quando chegarmos aqui).
  - **Importar .ics**: upload + parse client-side com `ical.js`, insert em batch.
- **Perfil público do fornecedor**: mini calendário 3 meses (pontos verde/vermelho/terracota).
- **Simulador — pergunta 5 já existe (data)**: ao buscar, filtrar fornecedores cuja data esteja em `supplier_blocked_dates`. Texto no resultado: "Mostramos apenas fornecedores liberados na sua data."
- **Kanban**: ao mover para `contratado`, se `wedding_date` ∈ blocked_dates → toast âmbar "⚠ Verifique disponibilidade".

---

## Detalhes técnicos importantes

- **Edge functions novas**: `convite-cron`, `broadcasts-cron`, `sync-google-calendar`, `sync-outlook-calendar` — todas agendadas via `pg_cron` + `pg_net` chamando o endpoint público da função.
- **Schema de papéis (item 3)**: o trigger atual `handle_new_user` já cria perfil; só preciso adicionar trigger `BEFORE INSERT ON auth.users` para checar duplicidade de e-mail (não pode ser feito em `auth.users` diretamente — vou fazer via constraint em `profiles` + verificação client-side em `Auth.tsx`).
- **Compatibilidade**: nenhuma alteração quebra schema existente; tudo é `ADD COLUMN` ou tabela nova.
- **Memória**: ao fim de cada fase atualizo `mem://features/...` correspondente.

---

## Próximo passo

Responda às 3 pré-decisões no topo (ou diga "tocar tudo, decida você") e eu começo pela Fase 1.