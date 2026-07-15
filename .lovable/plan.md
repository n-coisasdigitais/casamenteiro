# Correção de `match.ts` + unificação dos motores

## Parte 1 — Bugs em `src/lib/simulador/match.ts`

### Bug 1: filtro de cidade anulado por `|| true`
Linha 113 hoje:
```ts
.filter((s: any) => !cityNorm || (s.city || "").toLowerCase().includes(cityNorm) || true)
```
O `|| true` faz o filtro sempre passar. Substituir pela mesma cascata usada em `simulador.ts` (`matchCidade`): cidade exata → `cidades_atendidas` (jsonb array) → raio Haversine → mesmo estado se o fornecedor declara raio.

Mudanças em `match.ts`:
- Adicionar helper de coordenadas cacheadas + `haversineKm` (copiar de `simulador.ts`).
- Ampliar o `select` de `suppliers` para incluir `state, cidades_atendidas, raio_atendimento_km, lat, lng`.
- Antes do loop de categorias, resolver `buscaCoord` da cidade digitada via cache de `cidades_coordenadas`.
- Substituir o filtro atual por `matchCidade(s)` (mesma função de `simulador.ts`). Se `cityNorm` for vazio, aceita todos.
- Manter o boost de score "cidade exata → +100".

### Bug 2: `avgPrice(s) ?? slice` faz fornecedor sem preço "sempre caber"
Linha 115 hoje:
```ts
let price = avgPrice(s) ?? slice;
```
Fornecedor sem preço vira `slice` → `fits_budget_slice = true` (sempre). Isso infla resultados.

Mudança: tratar preço desconhecido como desconhecido:
- `const rawPrice = avgPrice(s);` (pode ser `null`).
- `estimated_price = rawPrice != null ? Math.round(rawPrice * (1 - appliedDiscount / 100)) : 0;` (ou manter `null` no tipo — vou manter 0 para não quebrar o tipo `number`, mas adicionar campo interno `has_price`).
- `fits_budget_slice = rawPrice != null && estimated <= slice * 1.15;` (sem preço → `false`).
- No score, remover o bônus `+50` de `fits_budget_slice` quando `!has_price` (já é `false`), e adicionar uma pequena penalidade opcional para sem preço não subir demais. Manter simples: apenas `fits_budget_slice` deixa de ser `true`.

## Parte 2 — Unificação dos motores

**Sim, dá para unificar.** Recomendo `calcularSimulacao` de `src/lib/simulador.ts` como fonte única, e apagar `src/lib/simulador/match.ts`.

Justificativa:
- `SimuladorResultado.tsx` já consome exclusivamente a forma `{ resumo, plano }` de `simulador.ts` (linhas 145, 165, 178). Hoje, quando `SimulatorCTA` chama `computeSimulador` e grava em `sessionStorage.preview_simulacao`, o resultado tem `{ categories, total_budget, ... }` — sem `plano` nem `resumo` — e a verificação `!payload?.resultado?.plano` em `SimuladorResultado` **redireciona de volta para `/simulador`**. Ou seja, o preview do CTA já está quebrado hoje pela divergência dos motores. Unificar corrige isso.
- `simulador.ts` cobre tudo que `match.ts` cobre e mais: cascata de cidade (Haversine + estado), filtro de guest_min/max, filtro efetivo por orçamento, `pricing_model = por_pessoa`, geração de alertas, persistência em `home_simulacoes`, `recalcularCategoria`.
- O único recurso presente em `match.ts` e ausente em `simulador.ts` é o filtro por `data_evento` específica (`supplier_blocked_dates` daquela data + `supplier_promo_dates` daquela data). Isso hoje **não é usado por `SimuladorResultado.tsx`** (o recálculo lá só passa `aceitaOciosas` como toggle, nunca uma data). Portanto, apagar `match.ts` não regride nada visível na UI atual. Se no futuro quisermos honrar `data_evento`, migramos essa parte para dentro de `simulador.ts`.

### O que muda no `SimulatorCTA.tsx`
- Trocar `import { computeSimulador } from "@/lib/simulador/match";` por `import { calcularSimulacao, type Estilo } from "@/lib/simulador";`.
- Substituir o bloco `submit()`:
  - Normalizar `estilo` (o CTA já usa "intimista"/"elegante"/"grandioso", que casam com o `Estilo` do simulador — `calcularSimulacao` também aceita rótulos livres).
  - Chamar `const r = await calcularSimulacao(orcamento, convidados ?? 100, cidade, estilo as Estilo, false)` — isso já grava a simulação em `home_simulacoes` internamente e devolve `simulacaoId`.
  - Para usuário logado: `calcularSimulacao` já vincula `couple_id` via `auth.getUser()`; navegar para `/simulador/resultado?id=${r.simulacaoId}`.
  - Para usuário anônimo: `calcularSimulacao` grava sem `couple_id`/`user_id` (o INSERT em `home_simulacoes` já suporta valores nulos e o `salvarSimulacao` só busca `couples` se houver `user`). Guardar `{ resultado: { resumo: r.resumo, plano: r.plano, alertas: r.alertas }, orcamento_total, num_convidados, cidade, estilo, data_evento }` em `sessionStorage.preview_simulacao` para o preview mode e navegar para `/simulador/resultado?preview=1`.
  - Remover o `payload.data_evento`/`prazo_meses` que hoje é enviado ao insert manual — `calcularSimulacao` já faz o insert. Se quisermos manter `data_evento`/`prazo_meses` no lead do admin, precisaríamos passar isso adiante; por ora ficam **apenas no `sessionStorage` do preview** (já usados na UI). Alternativa: fazer um `UPDATE home_simulacoes SET ... WHERE id = simulacaoId` logo depois com esses dois campos, se importar para métricas.

### O que muda no `SimuladorResultado.tsx`
- Nenhuma mudança de shape. Passa a ler `resultado.plano`/`resultado.resumo` no preview também (que hoje falha).

### Arquivos
- **Editar**: `src/lib/simulador/match.ts` (bugs 1 e 2) **OU**, se unificarmos na mesma passada, apagar. Recomendo:
  1. Aplicar as correções em `match.ts` para não deixar código ruim vivo enquanto migro.
  2. Migrar `SimulatorCTA.tsx` para `calcularSimulacao`.
  3. `grep` confirmar que ninguém mais importa `@/lib/simulador/match` (SimulatorCTA é o único uso hoje) e **deletar** `src/lib/simulador/match.ts` + a pasta se ficar vazia.

### Impedimentos conhecidos
- Nenhum bloqueante. Perda funcional zero em relação ao que a UI hoje usa. Trade-off: perdemos o suporte a `data_evento` específica no cálculo (blocked/promo do dia); recuperável depois migrando essa lógica para `simulador.ts`.

## Resumo das mudanças de arquivos
- `src/lib/simulador/match.ts`: corrigir bugs 1 e 2 **e depois deletar** após migrar o CTA.
- `src/components/home/SimulatorCTA.tsx`: usar `calcularSimulacao`; ajustar preview e navegação.
- `src/pages/SimuladorResultado.tsx`: **sem alterações**.
