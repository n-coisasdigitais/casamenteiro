
# Área de Demonstração (/demo)

Cria uma área pública de demonstração da plataforma, com contas fictícias já logáveis, dados de exemplo populados e proteções para não misturar com produção. Serve para você apresentar a plataforma a fornecedores e casais reais sem impactar o banco de produção "de verdade".

## Como vai funcionar (visão do usuário)

1. Você (ou um prospect) acessa `casamenteiro.com.br/demo`.
2. Vê uma landing simples com dois botões: **"Entrar como casal demo"** e **"Entrar como fornecedor demo"**.
3. Ao clicar, o sistema faz login automático com a conta fictícia correspondente e leva ao dashboard normal.
4. Um **banner amarelo fixo no topo** aparece em toda a navegação: *"Você está no ambiente de demonstração. Os dados aqui são fictícios."*
5. Dentro da demo, tudo funciona: navegar, cadastrar convidados, mandar orçamento, ver Kanban, etc. Exceto ações "de mundo real" (envio de e-mail, cobrança) — essas ficam simuladas.
6. Um botão discreto **"Sair da demo"** e outro **"Resetar demo"** (visível só para admins) ficam disponíveis.

## Escopo — o que ENTRA e o que NÃO ENTRA

**Entra:**
- Landing `/demo` com dois CTAs.
- Contas fictícias: `casal.demo@casamenteiro.com.br` e `fornecedor.demo@casamenteiro.com.br` (já criadas via SQL, senhas fixas).
- Seed rico de dados: casal com data, orçamento, 150 convidados, 5 fornecedores no Kanban (2 contratados, 2 negociando, 1 descartado), 3 orçamentos ativos com conversa, tarefas seedadas, perfil público preenchido. Fornecedor com fotos, categoria, cidade, 3 avaliações reais e 4 leads recebidos.
- Coluna `is_demo` boolean nas tabelas `profiles`, `couples`, `suppliers` para filtrar.
- Banner global de demonstração (visível quando o usuário logado tem `is_demo=true`).
- Bloqueio de ações sensíveis quando `is_demo`: envio real de e-mail (funções edge checam e simulam), pagamento, alteração de dados de contato reais.
- Botão "Resetar demo" no admin (`/admin/configuracoes`) que roda um SQL de reset.
- Filtro automático nas queries que listam usuários/casais/fornecedores para o público — contas demo **não aparecem** no `/casais` feed, `/explorar`, sitemap, métricas de admin, e nem contam nas contagens de social proof da home.

**Não entra:**
- Banco separado ou projeto Lovable duplicado (fica no mesmo projeto/banco).
- Duplicação do código — a demo é o mesmo app, só muda dado + banner.
- Ambiente de "staging" separado — para isso, o Preview URL do Lovable já serve.

## Detalhes técnicos

**1) Migration nova (schema):**
- Adicionar coluna `is_demo boolean NOT NULL DEFAULT false` em `public.profiles`, `public.couples`, `public.suppliers`.
- Adicionar índice parcial `WHERE is_demo = true` em cada uma para filtragem rápida.

**2) Migration de exclusão nas listagens públicas:**
- Ajustar as policies/queries de:
  - `couple_public_profiles` (feed `/casais`) → filtrar `is_demo=false` no join com `couples`.
  - `suppliers` público (`/explorar`, `/categoria/:slug`, `SupplierProfile`) → adicionar `.eq('is_demo', false)` nos hooks de leitura pública.
  - `scripts/generate-sitemap.ts` → excluir demo.
  - Métricas admin (`AdminMetrics`, `AdminCoupleCRM`, `AdminSupplierCRM`) → adicionar toggle "Incluir demo" (padrão desligado).
  - `HomeHero` contagem de fornecedores → excluir demo.
  - Contagem `frases_home` e social proof → excluir demo.

**3) Seed de dados (via insert tool):**
- Criar via `auth.admin` os 2 usuários fictícios com `is_demo=true` no profile.
- Popular casal demo com: `wedding_date` 6 meses no futuro, `partner_name`, orçamento R$ 120k, cidade "São Paulo", 150 convidados (mix de status), 5 `couple_suppliers` em stages diferentes, 3 `quotes` com mensagens, `couple_public_profiles` com bio e slug `ana-e-carlos-demo`.
- Popular fornecedor demo: categoria "Fotografia", cidade "São Paulo", fotos de portfólio (reaproveitar bucket `supplier-photos`), status `approved`, 3 `reviews` fictícias, 4 leads.

**4) Frontend:**
- `src/pages/DemoLanding.tsx` — landing pública com 2 CTAs.
- Rota `/demo` no `App.tsx`.
- `src/lib/demoAuth.ts` — helper que faz `signInWithPassword` com credenciais hardcoded (senhas públicas — são contas demo, não tem risco).
- `src/components/DemoBanner.tsx` — banner amarelo fixo, renderizado no `App.tsx` quando `profile.is_demo === true`. Botão "Sair da demo" (signOut + redirect `/demo`).
- Extender `AuthContext` para expor `isDemo` derivado do profile.
- Guards em componentes que fazem ações sensíveis (envio de invite por email real) — quando `isDemo`, mostrar toast "Ação simulada no ambiente demo".

**5) Reset da demo (admin):**
- Botão em `AdminSettings.tsx` "Resetar dados demo".
- Chama nova função `admin_reset_demo()` (SECURITY DEFINER, checa `has_role admin`) que:
  - Deleta todos os dados vinculados aos user_ids demo (guests, tasks, quotes, budget, reviews, photos, etc).
  - Re-executa o seed populando dados fresquinhos.
- Feedback com toast e contagem de registros recriados.

**6) Segurança:**
- As senhas das contas demo são públicas de propósito (ficam no botão). Isso é aceitável porque:
  - As contas têm `is_demo=true` e são invisíveis para listagens públicas.
  - Não têm dados reais.
  - Não podem executar ações destrutivas em produção.
- Bloqueio explícito: RLS extra que impede contas demo de: promover-se a admin, alterar `feature_flags`, alterar dados de outros usuários.

## Estrutura de arquivos afetada

```text
supabase/migrations/xxx_demo_mode.sql          [novo — schema]
src/pages/DemoLanding.tsx                       [novo]
src/components/DemoBanner.tsx                   [novo]
src/lib/demoAuth.ts                             [novo]
src/contexts/AuthContext.tsx                    [editar — expor isDemo]
src/App.tsx                                     [editar — rota /demo + banner global]
src/pages/AdminSettings.tsx                     [editar — botão reset]
src/pages/Home.tsx                              [editar — filtrar demo em contagens]
src/pages/CasaisFeed.tsx                        [editar — filtrar demo]
src/pages/Explore.tsx / CategoriaPublica        [editar — filtrar demo]
scripts/generate-sitemap.ts                     [editar — filtrar demo]
supabase/functions/send-invite-emails/index.ts  [editar — no-op se is_demo]
```

## Ordem de execução

1. Migration de schema (`is_demo` + índices).
2. Seed inicial das contas demo e dados.
3. Frontend: landing, banner, contexto, rota.
4. Filtros de exclusão nas listagens públicas.
5. Botão de reset no admin.
6. Guards nas edge functions sensíveis.
7. Teste manual: entrar em `/demo`, verificar banner, navegar, confirmar que a conta demo não aparece em `/casais` nem `/explorar`, testar reset.

## Depois de implementar

- Você usa `/demo` para apresentações comerciais.
- Contas de teste antigas (`casal.teste` / `fornecedor.teste`) continuam existindo para seus testes internos de fluxo.
- Preview x Publish continua funcionando normalmente para você trabalhar no código sem afetar produção (mudanças de tela só sobem quando você clicar Publish).
