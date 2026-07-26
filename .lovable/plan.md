# Plano — Painel do Fornecedor: navegação, métricas acionáveis e mini-CRM

Três frentes, entregues juntas mas isoladas por arquivo/flag para não quebrar o resto.

## 1) Nova navegação em 5 destinos

Agrupar as 8 abas atuais (metrics, quotes, availability, area, profile, photos, files, reviews + vagas/reservas condicionais) em 5 destinos:

- **Painel** — `metrics`
- **Orçamentos** — `quotes` (kanban + conversa, badge com contagem)
- **Meu negócio** — container com sub-abas horizontais: Perfil · Fotos · Arquivos · Disponibilidade · Atendimento (+ Reservas se `reserva_datas_ociosas`)
- **Equipe e vagas** — só quando `vagas` estiver ligada
- **Avaliações** — `reviews`

### Layout responsivo
- **Desktop (≥ md):** menu lateral fixo à esquerda (`w-60`), ícone + rótulo, item ativo destacado. Conteúdo à direita. Dentro de "Meu negócio", sub-abas horizontais (shadcn `Tabs`).
- **Mobile (< md):** sem sidebar. Tab bar fixa no rodapé (`fixed bottom-0`) com 4 destinos principais: Painel · Orçamentos · Negócio · Vagas (Vagas oculto se flag off; nesse caso mostra Avaliações). Avaliações acessível como card/link dentro de Painel. Conteúdo com `padding-bottom` para não ficar atrás da barra.
- **Badges** (contagem de Orçamentos, alerta de leads atrasados) aparecem nos dois layouts.

URL continua com `?tab=` para deep-link (compatível com notificações e links atuais). Sub-abas de "Meu negócio" usam `?sub=`.

## 2) Cards de métrica acionáveis no Painel

No topo do Painel (`SupplierMetrics`), acrescentar três cards clicáveis:

1. **Visitas no perfil** (já existe, mantém).
2. **Leads aguardando resposta** — `quotes` do fornecedor com `kanban_status in ('enviado','visto')` e sem `quote_proposals` do fornecedor. Mostra contagem + "há Xh" do mais antigo. Borda/texto vermelho quando o mais antigo passa de 24h. Clique → aba Orçamentos com `?tab=quotes&filter=aguardando`.
3. **Propostas sem retorno** — `quotes` com proposta enviada pelo fornecedor mas sem mensagem/proposta do casal há ≥ 3 dias. Ação inline "Lembrar" e clique → `?tab=quotes&filter=sem_retorno`.

**Aviso no topo do Painel:** se houver pelo menos 1 lead aguardando > 24h, banner de atenção "Você tem N pedidos aguardando resposta — responder rápido aumenta suas chances de fechar." com CTA para a aba Orçamentos.

Nenhuma tabela nova; tudo derivado de `quotes` + `quote_proposals` (última mensagem/proposta por remetente). Para "sem retorno", usar `quote_proposals.created_at` mais recente por `quote_id` cruzando com `sender_id` do casal via join com `quotes.user_id`.

O `SupplierQuotesKanban` passa a aceitar `initialFilter` para respeitar o `?filter=` da URL.

## 3) Mini-CRM de leads (flag `crm_fornecedor`, on por padrão)

Nova aba **"Leads"** dentro do destino **Orçamentos** (Tabs internas: "Kanban" · "Leads"), visível só com a flag ligada.

### UI da lista
Colunas/linhas com: casal, data do evento, nº convidados, categoria, valor proposto (última proposta), status kanban, tempo desde o último contato, próximo passo (badge), semáforo:
- verde: respondido em < 24h
- amarelo: aguardando 24–48h
- vermelho: > 48h sem resposta do fornecedor

Filtros: status, categoria, urgência. Ordem padrão: mais antigos sem resposta primeiro.

**Métricas no topo do CRM:** taxa de resposta média (respondidos ÷ total), taxa de fechamento (`kanban_status='contratado'` ÷ total), valor médio fechado.

### Ações por lead
- **Lembrar** — botão nas propostas enviadas sem retorno há ≥ X dias. Insere `notifications` para `couples.user_id` e registra a nota `Lembrete enviado em <data>`.
- **Anotação interna** — textarea salvo em `lead_notes`.
- **Lembrete com data** — cria linha com `remind_at` que gera notificação para o fornecedor (via job existente `broadcast-cron` ou trigger simples de leitura no load).

### Schema novo
Tabela `lead_notes`:

```
id uuid pk, quote_id uuid → quotes, supplier_id uuid → suppliers,
author_id uuid, note text, remind_at timestamptz null,
reminded_at timestamptz null, created_at, updated_at
```

RLS: fornecedor dono do supplier faz tudo; admin lê tudo. GRANTs padrão (authenticated + service_role, sem anon).

Feature flag `crm_fornecedor` (grupo Fornecedor, essencial=false, enabled=true) registrada em `feature_flags` e adicionada em `FEATURE_FLAG_DEFAULTS` no `FeatureFlagsContext`.

## Detalhes técnicos

**Arquivos novos**
- `src/components/supplier/SupplierSidebar.tsx` — menu lateral (desktop) com 5 destinos.
- `src/components/supplier/SupplierMobileTabBar.tsx` — tab bar fixa (mobile).
- `src/components/supplier/SupplierBusinessTabs.tsx` — sub-abas de "Meu negócio".
- `src/components/supplier/SupplierActionCards.tsx` — cards acionáveis do Painel + banner de atenção.
- `src/components/supplier/SupplierLeadsCRM.tsx` — lista, filtros, métricas, ações.
- `src/components/supplier/LeadNoteDialog.tsx` — anotação + lembrete.
- Migration: cria `lead_notes` (com GRANT + RLS + trigger updated_at) e insere flag `crm_fornecedor` em `feature_flags`.

**Arquivos alterados**
- `src/pages/SupplierDashboard.tsx` — troca `TabsList` chapada por sidebar/tab bar + rotear destinos; mantém carregamento e handlers atuais.
- `src/components/supplier/SupplierMetrics.tsx` — inclui `SupplierActionCards` no topo.
- `src/components/supplier/SupplierQuotesKanban.tsx` — aceita `initialFilter` e (opcional) prop `hideInternalTabs`.
- `src/contexts/FeatureFlagsContext.tsx` — adiciona `crm_fornecedor` na tipagem e nos defaults.

**Regras derivadas (sem trigger novo)**
- "Aguardando resposta" = `quotes` sem `quote_proposals` cujo `sender_id` seja o `user_id` do fornecedor.
- "Sem retorno" = último `quote_proposals` do quote foi do fornecedor e a diferença de tempo até hoje ≥ 3 dias.
- Cálculos feitos no client no primeiro momento (o volume por fornecedor é baixo). Se crescer, criar view/rpc depois.

**Fora do escopo**
Nenhuma mudança em `quotes`, `quote_proposals`, kanban interno, telas de conteúdo (Perfil, Fotos, Arquivos, Disponibilidade, Atendimento, Reviews, Vagas, Reservas) além de reagrupá-las visualmente.
