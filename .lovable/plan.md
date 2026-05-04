
# Nova Home "Casamenteiro" + Renomeação da Home Atual

Vamos transformar a home atual numa página de busca, e criar uma nova home cinematográfica com preloader animado, blocos scroll-driven com fotos e um simulador de orçamento como CTA principal. Tudo gerenciável por um novo painel admin.

## Etapa 1 — Preservar a home atual como página de busca

A home atual (`src/pages/Index.tsx`) já tem hero com busca, chips de categorias, fornecedores em destaque e CTAs. Em vez de destruir, vamos:

- Renomear `src/pages/Index.tsx` → `src/pages/Explore.tsx` (componente `Explore`).
- No `App.tsx`:
  - `/` passa a renderizar a **nova** `Home`.
  - `/explorar` renderiza `Explore` (a antiga home, intacta).
  - Mantém `/buscar` apontando para `SupplierSearch` (já existe e é a busca avançada).
- Atualizar os links internos que apontavam para a antiga home onde fizer sentido (logo "Casamenteiro" continua indo para `/`).

Resultado: nada se perde, a experiência antiga fica acessível em `/explorar`.

## Etapa 2 — Banco de dados

Três novas tabelas (migration), seguindo o padrão atual em português dos nomes recentes (`simulated_budgets`, `supplier_leads`):

```text
frases_home
  id uuid PK, grupo text, texto text, ordem int,
  ativo boolean default true, criado_em timestamptz default now()

secoes_home
  id uuid PK, supplier_id uuid (nullable, sem FK rígida — padrão do projeto),
  foto_url text, frase text, subtexto text,
  ordem int default 0, ativo boolean default true,
  criado_em timestamptz default now()

home_simulacoes
  id uuid PK, user_id uuid nullable, couple_id uuid nullable,
  orcamento_total numeric, num_convidados int, cidade text, estilo text,
  criado_em timestamptz default now()
```

RLS:
- `frases_home` e `secoes_home`: SELECT público (anon + authenticated) somente onde `ativo = true`; ALL para admin (`has_role(auth.uid(),'admin')`).
- `home_simulacoes`: INSERT público (anyone); SELECT só pelo dono (`user_id = auth.uid()` ou `couple_id` do user) ou admin.

Seed inicial:
- Grupo `intro` com as 4 frases padrão do briefing.
- 4 registros em `secoes_home` com as frases/subtextos do briefing e fotos Unsplash de fallback.

Observação: já existe a tabela `simulated_budgets` (do simulador completo). A `home_simulacoes` é especificamente para o mini-simulador de 4 campos da home, mas no submit também espelhamos em `simulated_budgets` para manter o histórico unificado e reaproveitar a tela de resultado quando ela existir.

## Etapa 3 — Nova página Home (`src/pages/Home.tsx`)

Mobile-first. Tailwind + Framer Motion (já no stack disponível; se não estiver, instalar `framer-motion`).

### Tokens visuais
Adicionar em `tailwind.config.ts` / `index.css`:
- `--bg-cream: #FAF8F5`
- `--ink: #1A1A1A`
- `--rose-gold: #C9956C`
- `--olive: #7D9B76`
- Fontes via Google Fonts no `index.html`: **Playfair Display** (headings) e **Inter** (corpo).

### Seção 1 — Preloader (100vh)
- Fundo `#1A1A1A` com foto desfocada + overlay escuro 70%.
- Sem navbar enquanto ativo.
- Barra de progresso fina rose-gold na base, anima 0→100% em 4s.
- Frases buscadas de `frases_home` onde `grupo='intro'` e `ativo=true`, ordenadas por `ordem`. Fallback hardcoded com as 4 frases do briefing.
- Cada frase: fade in (300ms) → hold 1.2s → fade out (300ms), centralizada, Playfair grande, branca.
- Ao chegar 100%: dissolve (500ms) e desmonta o preloader. Trava scroll (`overflow:hidden` no body) durante a animação.
- Usa `sessionStorage` para não repetir o preloader em navegações internas dentro da mesma sessão (evita irritação).

### Navbar pós-preloader
- Fixa no topo, fundo `#FAF8F5/90` com blur, borda inferior sutil.
- Esquerda: logo "Casamenteiro" (Heart + wordmark Playfair).
- Direita: link "Entrar" (ghost) + botão "Simular" (rose-gold) que faz scroll suave para a seção 3.
- Fade in 400ms quando o preloader sai.

### Seção 2 — 4 blocos scroll-driven (cada um 100vh)
- Dados de `secoes_home` ativos, ordenados por `ordem`. Fallback com os 4 blocos do briefing.
- Layout: grid 2 colunas no desktop (texto / foto), coluna única no mobile (texto em cima, foto embaixo).
- Texto: número editorial "(01)", "(02)"… em Playfair italic, cor olive; frase principal grande em Playfair; subtexto em Inter, cinza médio.
- Foto: `aspect-square` lg, `rounded-xl`, sombra suave.
- Animações com Framer Motion `whileInView`:
  - Texto: `opacity 0→1`, `y +30→0`, duração 0.6s ease-out.
  - Foto: `scale 0.95→1`, `opacity 0→1`, mesma duração.
- `lazy loading` nas imagens (`loading="lazy"`).

### Seção 3 — CTA Simulador (≥80vh)
- Fundo escuro com foto + overlay 60%.
- Heading Playfair branco: "Quanto você quer investir no seu casamento?"
- Subtexto: "Responde 4 perguntas. A gente monta o plano pra você."
- Card translúcido (`bg-white/10 backdrop-blur`) com formulário grid 2x2 (desktop) / 1col (mobile):
  1. Orçamento total — slider (R$ 10k–R$ 500k) + display do valor formatado.
  2. Nº de convidados — input numérico.
  3. Cidade — input com datalist autocomplete de ~30 principais cidades de MG.
  4. Estilo — select: "Simples e emocionante" / "Médio e elegante" / "Grande e memorável".
- Botão "Simular meu casamento →" rose-gold, full-width no mobile.
- Submit:
  - Insert em `home_simulacoes` (e espelha em `simulated_budgets`).
  - Se logado e tem `couple_id`: vincula.
  - Se NÃO logado: salva payload em `localStorage.pending_simulacao` e redireciona para `/cadastro?redirect=simulador` com toast: "Seu simulador foi salvo! Crie sua conta gratuita pra ver o resultado completo."
  - Após simulação criada, redireciona para `/simulador/resultado?id=...` (rota placeholder por ora — exibe os dados salvos; lógica de matching com fornecedores fica para o próximo ciclo).

### Footer
Reutiliza o footer atual (créditos N Coisas Digitais — memória obrigatória).

## Etapa 4 — Painel admin `/admin/home-config`

Nova página `src/pages/AdminHomeConfig.tsx`, protegida por `has_role(...,'admin')` (mesmo padrão do `AdminPanel`). Link adicionado no `AdminPanel`.

Três abas (`Tabs` shadcn):

**1. Frases**
- Lista grupos distintos de `frases_home`.
- Criar grupo (nome + descrição opcional armazenada como primeira frase meta, ou simplesmente um grupo vazio).
- Selecionar grupo → tabela com frases (texto + ordem + ativo), CRUD inline.
- Toggle "grupo ativo" para a seção `intro` — garante apenas um grupo ativo por seção via update transacional (desativa os outros do mesmo escopo).

**2. Blocos da Home (fotos)**
- Lista `secoes_home` com preview da foto, frase, subtexto, fornecedor vinculado (se houver).
- Botão "Adicionar bloco": escolher fornecedor da lista (`suppliers` aprovados) OU upload livre, definir frase/subtexto.
- Toggle ativo/inativo.
- Drag & drop para reordenar (atualiza `ordem` em batch). Usa `@dnd-kit` (leve) ou um sortable simples baseado em botões ↑↓ para evitar dependência nova.

**3. Preview**
- Botão "Ver como ficará" → abre `/?preview=1` em nova aba (a Home respeita `?preview=1` pulando o cache de sessionStorage do preloader).

## Etapa 5 — Detalhes técnicos

- **Roteamento**: `/` = nova Home, `/explorar` = antiga Home (renomeada), `/admin/home-config` = novo painel.
- **SEO**: atualizar `index.html` com title "Casamenteiro — planeje seu casamento com leveza", meta description e og:image (foto Unsplash de casamento).
- **Performance**: imagens da seção 2 com `loading="lazy"`, Playfair carregada com `display=swap`.
- **Acessibilidade**: preloader respeita `prefers-reduced-motion` (pula direto para o conteúdo); botões com aria-labels.
- **Sem libs pesadas**: Framer Motion só (já leve); sem GSAP.
- **Padrões do projeto**: usar `.maybeSingle()` em queries Supabase (regra de memória), pt-BR em toda UI/toasts.

## Arquivos novos / alterados

Criados:
- `supabase/migrations/<timestamp>_home_tables.sql`
- `src/pages/Home.tsx`
- `src/components/home/Preloader.tsx`
- `src/components/home/HomeNavbar.tsx`
- `src/components/home/StoryBlock.tsx`
- `src/components/home/SimulatorCTA.tsx`
- `src/pages/AdminHomeConfig.tsx`
- `src/pages/Explore.tsx` (renomeado de `Index.tsx`)

Editados:
- `src/App.tsx` — rotas `/` e `/explorar`
- `src/pages/AdminPanel.tsx` — link para `/admin/home-config`
- `tailwind.config.ts` / `src/index.css` — tokens de cor + fontes
- `index.html` — Google Fonts + meta SEO
- `package.json` — adiciona `framer-motion` (e opcionalmente `@dnd-kit/core` se formos com drag-drop real)

## Pontos para confirmar antes de implementar

1. Para o **drag & drop** dos blocos no admin, prefere a solução leve com setas ↑↓ (zero dependência) ou o drag real com `@dnd-kit` (UX melhor, +1 lib)?
2. A página `/simulador/resultado` ainda não existe. Confirma que por ora ela pode ser uma tela placeholder que mostra os dados salvos + lista os fornecedores demo aprovados que se encaixam na cidade/orçamento, deixando o matching avançado para um próximo ciclo?
3. Posso usar fotos do Unsplash diretamente como fallback (links externos), ou prefere que eu já as suba para o bucket `supplier-photos` para evitar dependência externa?
