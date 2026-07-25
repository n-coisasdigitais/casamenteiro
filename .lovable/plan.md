## Diagnóstico confirmado

O painel mostra dois números porque eles vêm de fontes diferentes:

- **"Orçamento do plano" R$ 228.000** = `couples.target_budget` (teto herdado do `orcamento_total` da simulação).
- **"Meu Orçamento Estimado" R$ 174.960** = soma real de `budget_items.estimated_cost`.

E `budget_items` está inconsistente por três motivos:

1. **`criarPlano` perde a verba do Buffet** porque `espaco` e `buffet` compartilham o slug `espacos-buffet` e o loop deduplica por slug (só a primeira verba entra).
2. **`syncPlanIntoBudget` (WeddingBudget.tsx) grava uma linha por fornecedor sugerido** com `estimated_cost` = preço-base do fornecedor, misturando "verba planejada" com "preço de sugestão".
3. **Sem uniqueness** por `(couple_id, supplier_id)`, cada nova simulação salva pelo casal reinseriu os mesmos fornecedores (Rafael Luz 3×, Sabor & Arte 3×, etc.).

## O que vai mudar

### 1. Separar `espaco` e `buffet` no banco (migração)

Hoje `categories` só tem `espacos-buffet`. Vou adicionar duas categorias novas:

- `espaco` — "Espaço / Local"
- `buffet` — "Buffet / Gastronomia"

E migrar os `budget_items` e `couple_suppliers` existentes que apontam para `espacos-buffet`: se o fornecedor tem `pricing_model = 'por_pessoa'` (ou nome contém "buffet"), vira `buffet`; caso contrário `espaco`. Fornecedores em `suppliers` também são reclassificados. A categoria antiga `espacos-buffet` fica desativada (não removida) para não quebrar histórico.

### 2. `src/lib/simulador.ts`

- `CATEGORIA_SLUG`: `espaco → "espaco"`, `buffet → "buffet"` (deixam de colidir).
- `buscarFornecedores`: aceita filtrar por qualquer um dos dois slugs.
- `criarPlano`:
  - **Agrupa `budgetRows` por slug antes de inserir**, somando verbas caso ainda existam colisões futuras (defesa em profundidade).
  - **Grava uma linha `budget_items` por categoria do plano, com `estimated_cost = verba da categoria`.** Fornecedores sugeridos vão só para `couple_suppliers`, não para `budget_items`.
  - Se `sum(verbas) < orcamento_total`, insere linha extra `category = "reserva"`, `description = "Reserva / não alocado"` com a diferença.

### 3. `src/pages/WeddingBudget.tsx`

- **Remover a criação automática de `budget_items` por fornecedor sugerido** dentro de `syncPlanIntoBudget`. O sync passa a atualizar apenas `final_cost` da linha da categoria quando um fornecedor daquela categoria é contratado (`status = 'contracted'`).
- One-shot de limpeza: no primeiro load após deploy, detectar casais cujos `budget_items` foram inflados por sync anterior (mais de uma linha por categoria com `supplier_id != null`) e consolidar em uma linha por categoria com verba correta. Backup em coluna `notes` do primeiro item antes de deletar.
- Rótulos padronizados no header e nos cards:
  - "Meta" → **"Orçamento do plano"** (teto)
  - "Orçamento Estimado" → **"Alocado no plano"** (soma de estimated_cost)
  - Novo card **"Reserva"** = `orcamento_do_plano − alocado`, com badge verde se ≥ 0.
  - "Custo Final" continua igual.
  - "Saldo" segue como está (meta − gasto).

### 4. `src/components/plan/PlanHeader.tsx`

- Mesma padronização: "Orçamento do plano" (teto) e um segundo card "Alocado no plano" abaixo.

### 5. Deduplicação preventiva

- Índice único em `budget_items`: `(couple_id, category)` **quando `supplier_id IS NULL`** — impede duas linhas de verba para a mesma categoria.
- `criarPlano` passa a fazer `upsert` na categoria em vez de checar `existingCats` na aplicação.

## Detalhes técnicos

**Migrações:**
```sql
-- 1. novas categorias
INSERT INTO categories (name, slug, ...) VALUES
  ('Espaço / Local', 'espaco', ...),
  ('Buffet / Gastronomia', 'buffet', ...);

-- 2. reclassifica fornecedores
UPDATE suppliers SET category_id = (SELECT id FROM categories WHERE slug='buffet')
  WHERE category_id = (SELECT id FROM categories WHERE slug='espacos-buffet')
    AND (pricing_model = 'por_pessoa' OR lower(company_name) LIKE '%buffet%');
UPDATE suppliers SET category_id = (SELECT id FROM categories WHERE slug='espaco')
  WHERE category_id = (SELECT id FROM categories WHERE slug='espacos-buffet');

-- 3. reclassifica budget_items e couple_suppliers idem
-- 4. desativa slug antigo (active=false)
-- 5. índice único parcial
CREATE UNIQUE INDEX budget_items_couple_category_verba
  ON budget_items(couple_id, category) WHERE supplier_id IS NULL;
```

**Ordem de aplicação:** migração primeiro (com approval), depois edits em `simulador.ts`, `WeddingBudget.tsx`, `PlanHeader.tsx`. Nada quebra durante a transição porque o slug antigo continua existindo.

**Validação:** após aplicar, o casal de teste (287ad287…) deve mostrar `alocado = 228.000` (ou `alocado = 174.960` + `reserva = 53.040` se decidirmos preservar as verbas atuais em vez de recalcular). O plano vai recalcular verbas para todas as 9 categorias e reescrever a linha "reserva" a cada `criarPlano`.

## Fora de escopo

- Não vou tocar em `couple_suppliers`, quotes, ou negociações — só nas verbas planejadas.
- Não vou apagar histórico de simulações antigas.
- Não vou mexer no simulador público (Home / `/simulador`) além do split de slug.
