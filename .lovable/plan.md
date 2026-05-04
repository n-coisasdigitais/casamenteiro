## Simulador v2 — typeform + resultado com alertas

Adapto a UX e a lógica do `simulador.js` ao banco atual. **Não crio tabelas novas** — uso `suppliers`, `home_simulacoes`, `couples`, `couple_suppliers`, `wedding_tasks` que já cumprem o papel de `fornecedores`, `simulacoes`, `planos`, `plano_fornecedores`, `tarefas`.

### 1. Nova lib `src/lib/simulador.ts`

Funções com a mesma assinatura do `simulador.js` (para manter o "contrato"), mas mapeadas para o banco real:

- `calcularSimulacao(orcamento, convidados, cidade, estilo, aceitaOciosas)`:
  - Distribuição interna por estilo (`intimista`/`elegante`/`grandioso`) replicando os percentuais do JS para 9 categorias (espaço, buffet, fotógrafo, decoração, banda, cerimonialista, trajes, maquiagem, convites). Mapeia cada chave para o `categories.slug` correspondente do banco (faço a busca uma vez e cacheio o map).
  - Para cada categoria: lê `suppliers` (status=approved, `category_id`, `ilike` na cidade). Calcula preço estimado a partir de `price_min`/`price_max`. Valida se cabe na verba (com tolerância) e respeita `guest_min`/`guest_max`.
  - Aplica desconto se `aceitaOciosas && accepts_idle_dates && idle_discount_pct > 0`.
  - Ordena por `featured`, ociosas, rating, e devolve top 3 por categoria, já enriquecidos (`temDesconto`, `desconto`, `economiaEstimada`, `linkWhatsApp`).
  - Salva uma linha em `home_simulacoes` com `resultado` (jsonb) e devolve `simulacaoId`.
  - Retorna `{ simulacaoId, resumo, plano, alertas }` exatamente como o JS.

- `criarPlano(simulacaoId, resultado, nomeDoPlano, dataEvento)`:
  - Atualiza `couples` do usuário (`wedding_date`, `wedding_city`, `wedding_style`, `estimated_budget`, `target_budget`, `estimated_guests`, `header_quote = nomeDoPlano`).
  - Para cada categoria com fornecedor sugerido: faz upsert em `couple_suppliers` (`kanban_status='nao_iniciado'`, `estimated_value`, `simulation_id`, `category_id`).
  - Cria/garante itens em `budget_items` por categoria (estimated_cost = verba da categoria).
  - O trigger `trigger_seed_tasks_on_onboarding` + `seed_default_tasks` já cuida das tarefas; quando o casal mover um fornecedor para "contratado", o trigger `handle_kanban_contracted` marca a tarefa correspondente. **Nada novo de banco.**
  - Devolve `couple_id` (usado como `:id` da rota).

- `formatarReais(valor)` — helper.

### 2. Nova página `/simulador` — typeform tela cheia

`src/pages/Simulador.tsx`. Sem navbar, fundo `#FAF7F2`, barra de progresso fina no topo (cor primária warm da paleta).

Telas: boas-vindas → P1 orçamento (slider 5k–150k) → P2 convidados (4 cards A/B/C/D, autoavança) → P3 cidade (input underline, autofocus) → P4 estilo (3 cards, autoavança) → loading "Buscando fornecedores…".

Estado local conforme spec. Transição fade + slide. `Enter` avança onde aplicável. Botão Voltar inferior esquerdo, Próxima inferior direito.

Ao final:
- Se logado → chama `calcularSimulacao` e navega `/simulador/resultado?id=<simulacaoId>`.
- Se deslogado → mesma chamada (a tabela aceita `user_id null`), salva também o `simulacaoId` em `sessionStorage.pendingSimulacao` e navega para `/cadastro?redirect=/simulador/resultado?id=<id>` com mensagem.

O CTA inline da Home (`SimulatorCTA.tsx`) **continua existindo** como atalho rápido — só adiciono um botão "Quero responder com calma" que leva para `/simulador`.

### 3. Reescrita de `src/pages/SimuladorResultado.tsx`

Novo layout (coluna 720px, navbar simples no topo):

- **Resumo**: heading "Seu plano está pronto ✓", linha resumo, **badge de cobertura** (verde ≥80% / amber ≥50% / vermelho <50%) com contagem N/total.
- **Alertas**: renderiza `resultado.alertas` em banners (aviso amber, oportunidade verde, dica azul). Botões de ação reexecutam `calcularSimulacao` com `aceitaOciosas=true` e atualizam estado + persistem em `home_simulacoes.resultado`.
- **Toggle datas ociosas** sticky logo abaixo do resumo. Skeleton enquanto recalcula.
- **Grid por categoria**: header com ícone, nome, verba à direita (%); cards horizontais (foto/inicial, nome, cidade, badge `$/$$/$$$` derivado de `price_min`, badge "-N% data ociosa" se aplicável, botão WhatsApp). Vazio: mensagem + link `/buscar?categoria=<slug>`.
- **CTA fixo bottom**: "Assumir este plano →" (primário) e "Simular novamente" (outline → `/simulador`).

**Modal "Assumir este plano"**:
- Campos: nome do plano (input) + data prevista (date picker shadcn com `pointer-events-auto`).
- Se usuário não logado → fecha e redireciona `/cadastro?redirect=/simulador/resultado?id=<id>&assumir=1`.
- Se logado → chama `criarPlano`, mostra loading "Criando seu plano…", redireciona para `/meu-casamento/plano` (rota existente que renderiza `WeddingPlan`).

Recuperação pós-cadastro: `Auth.tsx` já trata `redirect=simulador`; ajusto para também respeitar `redirect=/simulador/resultado…&assumir=1` (volta para resultado e abre o modal automaticamente).

### 4. Rotas (`src/App.tsx`)

Adiciono `/simulador` → `Simulador` (typeform). Mantenho `/simulador/resultado`. Mantenho `/meu-casamento/plano` → `WeddingPlan`.

### 5. Estilo

- Paleta atual do projeto (warm terracotta/sage, Inter), sem importar `#C4856A` literal — uso tokens (`primary`, `accent`, `bg-background`) que já estão configurados conforme a regra de identidade visual.
- Botões pill (rounded-full) conforme memória de estilo.
- Tudo em pt-BR. Toda query Supabase com `.maybeSingle()`.

### 6. O que não muda

- Banco de dados: zero migration.
- `WeddingPlan.tsx` e abas Kanban/Orçamento/Pagamentos continuam como estão.
- `SimulatorCTA` da Home continua funcionando.
- `.env` já está configurado pela Cloud — não toco.

### Detalhes técnicos

```text
Arquivos novos:
  src/lib/simulador.ts          (calcularSimulacao, criarPlano, formatarReais)
  src/pages/Simulador.tsx       (typeform 4 perguntas)
  src/components/simulador/Welcome.tsx
  src/components/simulador/StepBudget.tsx
  src/components/simulador/StepGuests.tsx
  src/components/simulador/StepCity.tsx
  src/components/simulador/StepStyle.tsx
  src/components/simulador/AssumirPlanoDialog.tsx

Arquivos editados:
  src/App.tsx                   (rota /simulador)
  src/pages/SimuladorResultado.tsx  (reescrita conforme spec)
  src/pages/Auth.tsx            (suportar redirect=/simulador/resultado&assumir=1)
  src/components/home/SimulatorCTA.tsx  (link "responder com calma" → /simulador)
```

Mapeamento de slugs (lib interna): `espaco→recepcao` (ou `local`), `buffet→buffet`, `fotografo→fotografia`, `decoracao→decoracao`, `banda→musica`, `cerimonialista→cerimonialista`, `trajes→trajes`, `maquiagem→beleza`, `convites→convites`. Confirmo os slugs reais ao implementar (leio `categories` e ajusto).
