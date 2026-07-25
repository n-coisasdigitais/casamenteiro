
## Diagnóstico

- Em `home_simulacoes`, a policy de INSERT permite `user_id NULL` (usuário deslogado), mas a policy de SELECT exige `user_id = auth.uid()` ou `couple_id = ...`. Resultado: quando um visitante deslogado insere, o `.select("id")` após o `insert` **não retorna a linha** e `simulacaoId` volta como `null`. Confirmado nas policies atuais do banco.
- `SimulatorCTA.tsx` (home) já trata parcialmente o caso `!user`, mas quando o usuário está **logado** e o id vier `null` por qualquer motivo, cai em `navigate("/simulador/resultado?preview=1")` **sem gravar `sessionStorage`**, o que dispara loop no resultado.
- `Simulador.tsx` (página) hoje redireciona deslogado para `/cadastro?redirect=...` e, quando `simulacaoId` é null, cai em `navigate("/cadastro")` — nunca mostra o resultado.
- `SimuladorResultado.tsx` trata `id` nulo, mas não trata `"null"`/`"undefined"` como string, nem faz fallback ao sessionStorage quando a busca no banco retorna vazio; em vez disso, redireciona direto para `/simulador`, fechando o loop.

## Correções (todas em pt-BR)

### 1) `src/lib/simulador.ts` — `salvarSimulacao`
- Pegar `supabase.auth.getUser()` antes do insert (já faz) e gravar `user_id` explicitamente (id do usuário ou `null`).
- Manter `.select("id").maybeSingle()`, mas envolver em try/catch tolerante: se `data` vier vazio (RLS bloqueando o retorno para deslogado) ou houver erro, apenas logar e retornar `null` — nunca lançar exceção.
- Não alterar contrato público de `calcularSimulacao`: já retorna `{ simulacaoId: string | null, ... }`.

### 2) Migration — RLS de `home_simulacoes`
- Manter as policies existentes de UPDATE/DELETE/SELECT (dono + admin).
- Adicionar policy extra de SELECT que permite ler linhas com `user_id IS NULL AND couple_id IS NULL` **apenas dentro da mesma sessão de insert** — ou, mais simples e seguro: manter a lógica atual e aceitar que deslogado sempre cai no fluxo sessionStorage (correção 3). Nesse caso, **nenhuma migration é necessária** — a mudança fica só no frontend.
- Decisão: **não mexer no RLS**. Deslogado usa sessionStorage (correção 3). Logado já consegue ler a linha via policy `user_id = auth.uid()`.

### 3) `src/components/home/SimulatorCTA.tsx`
- Após `calcularSimulacao`, sempre gravar o payload em `sessionStorage["preview_simulacao"]` (útil como fallback para logado e deslogado).
- Regra única de navegação:
  - Se `r.simulacaoId` (truthy) → `navigate(\`/simulador/resultado?id=${r.simulacaoId}\`)`.
  - Senão → `navigate("/simulador/resultado?preview=1")`.
- Vale para logado e deslogado.

### 4) `src/pages/Simulador.tsx` — `finalizar`
- Aplicar a mesma regra da correção 3: sempre gravar payload em `sessionStorage["preview_simulacao"]`; se `simulacaoId` existir, navegar com `?id=`; senão, `?preview=1`.
- Remover o redirecionamento para `/cadastro` — o usuário vê o resultado; o CTA de cadastro fica dentro da página de resultado (já existente para o modo preview).
- Manter o registro em `cidades_interesse` quando `cidadeSemFornecedor` **e** houver `simulacaoId`.

### 5) `src/pages/SimuladorResultado.tsx`
- Normalizar `id`: tratar `null`, `"null"`, `"undefined"`, `""` como ausente.
- Fluxo unificado no `useEffect`:
  1. Se `id` ausente **ou** `preview=1` → tentar `sessionStorage["preview_simulacao"]`. Se válido, renderizar. Se não, ir para 3.
  2. Se `id` válido → buscar no banco via `.maybeSingle()`. Se retornar linha, renderizar. Se retornar vazio, tentar sessionStorage como fallback antes de qualquer navigate.
  3. Se nada existir → renderizar **tela de erro amigável** ("Não encontramos essa simulação") com botão "Fazer nova simulação" (`/simulador`) — **sem navigate automático**.

## Arquivos afetados

```text
src/lib/simulador.ts              [editar — salvarSimulacao tolerante]
src/components/home/SimulatorCTA.tsx  [editar — sessionStorage sempre + regra única]
src/pages/Simulador.tsx           [editar — mesma regra, sem /cadastro]
src/pages/SimuladorResultado.tsx  [editar — normalizar id, fallback, tela de erro]
```

Nenhuma migration necessária.

## Testes manuais (4 caminhos)

1. **Home + deslogado**: simular, esperar `?preview=1`, resultado renderizado do sessionStorage.
2. **Home + logado**: simular, esperar `?id=...`, resultado do banco; recarregar a página funciona.
3. **/simulador + deslogado**: mesmo comportamento do 1 (não redirecionar para /cadastro).
4. **/simulador + logado**: mesmo comportamento do 2.
5. Bônus: abrir `/simulador/resultado?id=null` → tela de erro amigável, sem loop.
