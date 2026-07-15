# Preview do resultado do simulador antes do cadastro

## Mudança 1 — `src/components/home/SimulatorCTA.tsx`

No ramo deslogado do `submit()` (dentro do `try`, quando `!user`):

- Manter o cálculo já existente (`computeSimulador` → `payload.resultado`).
- Fire-and-forget: `supabase.from("home_simulacoes").insert({ ...payload, user_id: null, couple_id: null })` sem `await` bloqueante nem `.select()`, dentro de `.then(() => {}, () => {})` — erros silenciosos (só serve para o admin ver o lead).
- `sessionStorage.setItem("preview_simulacao", JSON.stringify(payload))` (inclui `payload.resultado`).
- Trocar o toast: título "Seu plano está pronto!", descrição "Veja abaixo os detalhes do seu casamento.".
- `navigate("/simulador/resultado?preview=1")` no lugar do `/cadastro?...`.
- Remover o uso de `localStorage.setItem("pending_simulacao", ...)` desse ramo (sessionStorage passa a ser a fonte).

Ramo logado continua igual.

## Mudança 2 — `src/pages/SimuladorResultado.tsx`

**Carregamento**
- `const preview = params.get("preview") === "1";`
- No `useEffect` de load: se `preview` **ou** não houver `id`, ler `sessionStorage.getItem("preview_simulacao")`. Se existir, montar `sim` a partir do payload e `resultado` de `payload.resultado`, `setLoading(false)`. Se não existir, `navigate("/simulador")`.
- Se `id` existir e `!preview`, mantém o fetch atual em `home_simulacoes`.
- Pular efeitos que dependem do banco (o `useEffect` de `sim?.cidade` para checar fornecedores continua funcionando pois só lê `suppliers`; manter).
- Desabilitar recalcular/persistência em preview: o toggle "datas ociosas" e "editar categoria" ficam ocultos em modo preview (ou desabilitados) porque não há linha no banco para atualizar.

**Renderização em preview**
- Resumo (`orcamentoTotal`, `convidados`, `cidade`, `estilo`) e badge de cobertura: totalmente visíveis.
- Em cada categoria (`planoCats`), o **primeiro** card de fornecedor aparece normal; os demais recebem overlay com `backdrop-filter: blur(6px)` + camada `bg-background/60` + ícone `Lock` (lucide) e o texto "Crie sua conta grátis para ver". Cliques no card e nos links internos ficam bloqueados (`pointer-events-none` no conteúdo + camada de overlay clicável que abre `/cadastro?redirect=simulador&preview=1`).
- Nos cards em preview, substituir o bloco `f.linkWhatsApp ? <a> : <Link>` por um `<button disabled>` cinza "Pedir orçamento (criar conta)". O `<Link to={/fornecedor/f.id}>` do nome também vira `<span>` inerte.
- Barra fixa inferior em preview: um único `Button` largo "Criar conta grátis para ver todos os fornecedores" → `navigate("/cadastro?redirect=simulador&preview=1")`. Some o "Simular novamente" e o "Assumir este plano".
- Header: se preview e `!user`, mostra "Entrar" (comportamento atual já cobre).

## Mudança 3 — Pós-cadastro (`src/pages/Auth.tsx`)

O handler pós-signup vive em `Auth.tsx` (`finishRedirect`), não em `CoupleOnboarding.tsx`. Ajustar lá:

- **Antes** de verificar `localStorage.getItem("pending_simulacao")` (mantido para compat), verificar `sessionStorage.getItem("preview_simulacao")`.
- Se existir: buscar `couples.id` por `user_id`, inserir em `home_simulacoes` com `user_id`/`couple_id` do novo usuário, pegar `id` retornado, `sessionStorage.removeItem("preview_simulacao")`, `navigate(/simulador/resultado?id=<novoId>, { replace: true })` e `return`.
- Em caso de erro, toast e cai no fluxo padrão.
- Se `searchParams.get("redirect") === "simulador"` e não houver sessionStorage nem localStorage, cair no `/dashboard` como já faz.

`CoupleOnboarding.tsx` não precisa mudar — o insert acontece no login/callback via `Auth.tsx`, antes do onboarding.

## Detalhes técnicos

- Sem migration nova; a policy "Qualquer um cria simulação" já permite insert anônimo.
- Preview não persiste alterações (toggle ociosas oculto), então nada de RLS quebrar.
- Tudo em pt-BR, mantendo os tokens do design.
- Fluxo logado (com `id`) permanece 100% intacto.

## Ordem

1. `SimulatorCTA.tsx` — trocar ramo deslogado.
2. `SimuladorResultado.tsx` — flag preview + sessionStorage + overlay + CTA.
3. `Auth.tsx` — insert pós-signup a partir do sessionStorage.
