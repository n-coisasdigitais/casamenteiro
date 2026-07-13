## Objetivo

Adicionar uma primeira dobra clara com proposta de valor e CTA na Home, mantendo o storytelling em scroll abaixo. Ajustar imagem de um capítulo e a grid de features (novo card + esconder por feature flag).

## Escopo (só frontend/presentation + 1 pequena leitura no Supabase)

### 1. Nova primeira dobra — `src/components/home/HomeHero.tsx` (novo)

Renderizada em `src/pages/Home.tsx` como primeiro filho de `<main>`, ANTES de `<ScrollStory>`.

Layout desktop: 2 colunas (texto à esquerda, imagem à direita). Mobile: empilhado (texto em cima, imagem abaixo), CTA primário `w-full`. Altura da seção pensada para caber acima do fold em telas comuns (min-h-[calc(100svh-64px)] com padding generoso, sem forçar overflow).

Conteúdo:
- Eyebrow: `label-ui` discreto — "Marketplace de casamentos · Belo Horizonte e região metropolitana".
- H1 serifado (font-serif do projeto, peso 500/600, tamanho `clamp(2.5rem, 5.5vw, 4rem)`, tracking apertado, sentence case): "Descubra quanto custa o seu casamento — e economize casando em datas com desconto."
- Subtítulo sans, `text-muted-foreground`, `text-lg md:text-xl`, `max-w-xl`: "Simule em 1 minuto e receba fornecedores avaliados dentro do seu orçamento."
- CTA primário (pill terracota, `bg-primary text-primary-foreground`, `h-14 px-8 text-base font-medium`) → `/simulador`: "Simular meu casamento". Mobile: `w-full`.
- CTA secundário (pill contorno, `variant="outline"`, mais discreto, mesmo tamanho) → `/explorar`: "Explorar fornecedores".
- Prova social: 5 estrelas terracota (`lucide Star fill`) + texto ao lado. Estado inicial "carregando" sem número; depois de ler o count:
  - `count >= 20`: "{count} fornecedores verificados · BH e região"
  - `count < 20`: "Fornecedores avaliados · BH e região"
  - Query: `supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'approved')`.

Imagem à direita:
- Slot editável via `secoes_home`. Convenção: bloco com `grupo = 'hero'` (novo grupo lógico) — mas a tabela `secoes_home` não tem coluna `grupo` (é usada só como lista ordenada). Alternativa mais simples e sem migração: reservar `ordem = 0` como "bloco herói" e consumi-lo no HomeHero; se não existir, usar fallback estático (Unsplash luminoso, ex: `photo-1519741497674-611481863552` com params de brilho — validar visualmente).
- Fallback definido no componente para nunca quebrar.
- Renderização: `object-cover rounded-3xl aspect-[4/5]` no desktop, `aspect-[4/3]` no mobile, com leve sombra suave (nada de gradiente forte).

Tokens: apenas `--primary`, `--accent` (sálvia só para selos), `--muted`, `--background`, `--foreground`. Sem gradientes chamativos.

### 2. Ajustes no `ScrollStory` / dados da Home — `src/pages/Home.tsx`

- Ao carregar `secoes_home`, se `ordem = 0` for tratado como herói, filtrar esse bloco para não repetir no storytelling (passar só `ordem >= 1` para `ScrollStory`). Se optarmos por não usar `ordem = 0`, deixar HomeHero 100% estático editável só via código — decidir na implementação (recomendo `ordem = 0` = herói).
- Trocar a foto do capítulo "Datas que ninguém disputou" no `FALLBACK_BLOCOS` por uma imagem premium luminosa (Unsplash editorial de casamento em dia claro). A imagem "de verdade" continua editável em `secoes_home` pelo admin — só o fallback muda.

### 3. Grid "Como o Casamenteiro funciona pra você" — `src/components/shared/PlatformFeatures.tsx`

- Adicionar novo card "Datas com desconto":
  - Ícone: `Tag` (lucide).
  - Título: "Datas com desconto".
  - Texto: "Economize casando em datas ociosas."
  - Aparecer na variante `couple` (a usada na Home).
- Esconder condicionalmente por feature flag (`useFeatureFlag`):
  - Card "Perfil social do casal" → escondido quando `perfil_social_casal` off.
  - Card "Indicações que rendem" → escondido quando `indicacoes` off.
  - Verificar nomes exatos dos cards existentes ao abrir o arquivo; ajustar labels se divergirem.
  - Se `useFeatureFlag` ainda não existir no projeto, criar hook simples em `src/hooks/useFeatureFlag.ts` que lê `system_settings` (chave por flag) com cache leve — investigar no início da implementação se já existe algo similar.

### 4. SEO / metadata

- Sem mudança de rota. Manter `<SEO>` atual. Ajustar `description` da Home para refletir a nova proposta ("Simule o custo do seu casamento e economize casando em datas com desconto. Fornecedores avaliados em BH e região.").

## Direção visual (checklist)

- 1 accent (terracota). Fundos creme/off-white (`bg-background`). Sálvia só em selos/badges de desconto.
- H1 serifado grande + subtítulo sans menor. Pesos: 400 e 500/600 apenas. Sentence case.
- Respiro generoso: `py-20 md:py-28` na dobra herói.
- 1 CTA primário por dobra; secundário mais discreto (outline, mesmo tamanho).
- Mobile-first: empilha, CTA primário `w-full`, imagem depois.

## O que NÃO muda

- `SimulatorCTA`, footer, navbar, storytelling (exceto foto fallback do capítulo indicado).
- Nenhuma migração de banco. Nenhuma alteração em lógica de negócio.
- Admin de `secoes_home`/`frases_home` continua igual.

## Passos de implementação

1. Ler `PlatformFeatures.tsx`, `ScrollStory.tsx`, `HomeNavbar.tsx` e procurar `useFeatureFlag` no projeto.
2. Criar `src/components/home/HomeHero.tsx` com layout, textos, CTAs, prova social e leitura do count.
3. Editar `src/pages/Home.tsx`: importar e renderizar `HomeHero` antes de `ScrollStory`; ajustar fetch/filtro de `secoes_home` (bloco `ordem = 0` como herói) e trocar fallback do capítulo "Datas que ninguém disputou".
4. Editar `PlatformFeatures.tsx`: novo card "Datas com desconto" + esconder condicional via feature flags.
5. Ajustar `<SEO description>` da Home.
6. Verificar responsivo (desktop 1280, mobile 390) via Playwright + screenshots; conferir que o CTA primário fica acima do fold em altura ~800px.
