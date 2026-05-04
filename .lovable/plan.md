# Plano de atualização — Explore, paleta e tipografia

## 1. Nova paleta (sem vermelho, sem roxo)

Paleta neutra quente com acento âmbar/dourado suave — caloroso, moderno e elegante:

- `--background`: #FAFAF7 (off-white quente)
- `--foreground`: #1F1D1B (quase preto, marrom muito escuro)
- `--primary`: #D9905A (terracota suave / âmbar)
- `--primary-foreground`: #FFFFFF
- `--secondary`: #F2EEE8 (areia clara — usada para superfícies/seções)
- `--secondary-foreground`: #1F1D1B
- `--muted`: #F4F1EC
- `--muted-foreground`: #6B645C
- `--accent`: #4A7C6A (verde sálvia escuro — para destaques/badges)
- `--accent-foreground`: #FFFFFF
- `--border`: #E6E1D9
- `--input`: #E6E1D9
- `--ring`: #D9905A
- Aliases legados (`gold`, `coral`, `beige`, `cream`, `ink`, `olive`, `rose-gold`) remapeados para os novos tokens para não quebrar componentes existentes.

Atualizado em `src/index.css` (light + dark) e refletido nos tokens semânticos `--color-*`.

## 2. Tipografia — Inter (sem serifa)

Trocar Libre Franklin + Faustina por **Inter** como família única (display + body).

- `index.html`: substituir o `<link>` do Google Fonts por Inter (300, 400, 500, 600, 700).
- `src/index.css`:
  - `body` → `font-family: 'Inter', system-ui, sans-serif;` peso 400, line-height 1.6.
  - `h1–h6` → `Inter`, peso 600/700, letter-spacing -0.02em.
  - `.label-ui` e `.btn-pill` → `Inter`.
- `tailwind.config.ts`: `fontFamily.sans/serif/display` todas apontando para Inter.

## 3. Página Explore estilo Airbnb

Reconstruir `src/pages/Explore.tsx` com layout inspirado no anexo:

**Header fixo (estilo Airbnb)**
- Logo à esquerda.
- Barra de busca pill central com 3 campos divididos por separadores: **Onde** (cidade), **Quando** (data do casamento) e **Quem** (categoria/serviço), com botão circular âmbar de busca à direita.
- Menu de usuário (avatar + hambúrguer) à direita.
- Em mobile: barra colapsa em um único pill compacto que abre um drawer com os filtros.

**Tiras horizontais de cards (carrosséis)**
Cada seção segue o padrão do Airbnb: título à esquerda com seta, setas de navegação à direita, scroll horizontal de cards. Seções:
1. "Vistos recentemente" (últimos fornecedores que o usuário visitou — via localStorage; some se vazio).
2. "Fornecedores em destaque em {cidade do usuário}" (ou cidade padrão se sem login).
3. "Espaços e buffets muito procurados".
4. "Fotografia em alta".
5. "Decoração e flores".
6. Mais uma tira por categoria principal restante (música, doces, etc.).

**Card de fornecedor (estilo Airbnb)**
- Imagem quadrada com `rounded-xl`, badge sobreposta no topo-esquerdo ("Destaque" / "Novo" / "Mais procurado") e ícone de coração (favoritar) no topo-direito.
- Abaixo: nome • cidade, faixa de convidados, faixa de preço "A partir de R$ X", nota com estrela. Tudo em texto pequeno e discreto, igual Airbnb.
- Carrossel interno de fotos opcional (setas só no hover) — versão simples primeiro: foto principal apenas.

**Rodapé**
- Mantém o rodapé atual com créditos da N Coisas Digitais.

**Detalhes técnicos**
- Carrosséis usando scroll horizontal nativo (`overflow-x-auto snap-x`) com botões de seta sobrepostos que chamam `scrollBy`. Sem nova dependência.
- Reaproveita `SupplierCard` existente apenas como fallback; cria `ExploreSupplierCard` interno mais enxuto para casar com o visual Airbnb.
- Busca de dados: uma query por seção (limit 12), filtrando por `status='approved'` e ordenando por `featured` + `created_at`. Categorias carregadas uma vez.
- Favoritar continua usando a tabela `favorites` existente; sem login → toast pedindo para entrar.

## Arquivos editados
- `index.html` (fonte Inter)
- `src/index.css` (paleta + tipografia)
- `tailwind.config.ts` (fontFamily)
- `src/pages/Explore.tsx` (reescrita Airbnb-style)
- `mem://style/visual-identity` (atualizar paleta + fonte)

## Fora do escopo
- Não toco em `Home.tsx`, `StoryBlock`, `SimulatorCTA` nesta rodada — só herdam a nova paleta/fonte automaticamente via tokens.
- Não adiciono filtros avançados nem mapa nesta página (já existem em `/buscar`).
