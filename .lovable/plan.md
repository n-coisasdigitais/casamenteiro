## Plano 4 — SEO técnico + perfil público com campos dinâmicos

Objetivo: deixar o site indexável corretamente pelo Google, com JSON-LD em todas as páginas públicas, títulos/descrições dinâmicos contextuais, sitemap automático e canonical absoluto no domínio oficial.

---

### Domínio canônico

Usar `https://www.casamenteiro.com.br` como base em canonical, og:url e sitemap (domínio custom já configurado). Centralizar em `src/lib/seo.ts` para evitar string solta.

---

### 1. SEO já existente — auditoria rápida

- `SEO.tsx` já injeta title, description, OG, twitter, canonical, robots e `jsonLd`.
- `Home` já tem `Organization` + `WebSite` com `SearchAction`.
- `SupplierProfile` já tem `LocalBusiness` + `AggregateRating`.
- Faltam: SEO em rotas públicas restantes, descrição/title dinâmicos em busca, canonical absoluto, sitemap, robots com `Sitemap:`, `<html lang>` já está em pt-BR ✓.

---

### 2. Helper central `src/lib/seo.ts`

Pequeno utilitário para:
- `SITE_URL = "https://www.casamenteiro.com.br"`
- `absoluteUrl(path)` — junta path relativo com SITE_URL e normaliza `/`.
- `breadcrumbJsonLd(items)` — gera `BreadcrumbList` reutilizável.
- `truncate(text, max)` — corta descrição em 155 chars sem cortar palavra.

---

### 3. Rotas públicas que ganham (ou ajustam) `<SEO>`

| Rota | Título | Descrição | JSON-LD |
|---|---|---|---|
| `/` | (já tem) | — | (já tem) Organization + WebSite |
| `/explorar` e `/buscar` | "Fornecedores de casamento{cat? em cat}{cidade? em cidade} — Casamenteiro" | dinâmica a partir de categoria/cidade da URL | `BreadcrumbList` + `ItemList` (top 10 da página) |
| `/fornecedor/:id` | (já tem) | (já tem) | (já tem) + `BreadcrumbList` Home › Categoria › Fornecedor |
| `/fornecedor` | "Cadastre seu negócio — Casamenteiro" | usar `hero.subtitle` do config | `Service` |
| `/simulador` | "Simulador de orçamento de casamento — Casamenteiro" | descrição estática | — |
| `/simulador/resultado` | dinâmico ("Orçamento estimado: R$ X — Casamenteiro") | — | `noindex` (página de resultado pessoal) |
| `/termos`, `/privacidade` | título estático | descrição curta | `noindex` opcional não — manter index |
| `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha`, `/fornecedor/login`, `/fornecedor/cadastro` | título estático | — | `noindex` |
| `/admin/*` | — | — | já protegido; adicionar `noindex` no `AdminLayout` |
| `/dashboard`, `/tarefas`, `/orcamento`, `/convidados`, `/meus-fornecedores`, `/favoritos`, `/perfil`, `/meu-plano`, `/meu-casamento/plano`, `/fornecedor/painel` | — | — | `noindex` (área logada) |
| `/convite/:token`, `/convite/:token/obrigado` | título da noiva/noivo | — | `noindex` |
| `*` (NotFound) | "Página não encontrada — Casamenteiro" | — | `noindex` |

Onde já há `<SEO>` parcial, só completar; onde não há, adicionar no topo do JSX.

---

### 4. Title/description dinâmicos da busca (`Explore.tsx` / `SupplierSearch.tsx`)

Ler `categoria`, `cat`, `cidade`, `loc` dos `searchParams` e gerar:
- title: `Fotógrafos em São Paulo — Casamenteiro` (com fallback "Fornecedores de casamento")
- description: `Encontre {categoria} avaliados {em {cidade}} no Casamenteiro. Compare orçamentos, fotos e avaliações reais.`
- canonical: URL absoluta sem parâmetros voláteis (manter só `cat` e `loc`).
- JSON-LD `ItemList` com nome + url dos primeiros resultados carregados.

---

### 5. Perfil público (`SupplierProfile.tsx`) — enriquecer JSON-LD existente

Adicionar:
- `BreadcrumbList` Home › Categoria (link `/buscar?cat=slug`) › Fornecedor.
- No `LocalBusiness`: `image` = array com até 4 fotos do portfólio, `priceRange` derivado de `price_min`/`price_max` (`R$$` heurística), `geo` se houver `lat`/`lng`, `address` com `addressLocality`, `addressRegion`, `addressCountry: BR`.
- Canonical absoluto via `absoluteUrl(\`/fornecedor/${id}\`)`.
- Incluir campos dinâmicos `mostrar_no_perfil` como `additionalProperty[]` (PropertyValue) — assim Google entende atributos extras sem inventar schema.

---

### 6. Sitemap automático

Seguindo a skill `sitemap-robots`: criar `scripts/generate-sitemap.ts` (rodando em `predev`/`prebuild`) em vez de edge function — é mais simples, sempre fresco e indexável direto em `/sitemap.xml`.

Entradas:
- Rotas estáticas: `/`, `/explorar`, `/fornecedor`, `/simulador`, `/termos`, `/privacidade`.
- Combinações `/buscar?cat={slug}` por categoria ativa (fetch via supabase no script usando anon key).
- `/fornecedor/{id}` para cada fornecedor `status = 'approved'`.

Adicionar `predev`/`prebuild` ao `package.json` chamando `bunx tsx scripts/generate-sitemap.ts`. Script usa `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` já presentes no `.env`.

---

### 7. `public/robots.txt`

Editar (não substituir) adicionando:
```
Sitemap: https://www.casamenteiro.com.br/sitemap.xml

User-agent: *
Disallow: /admin
Disallow: /dashboard
Disallow: /tarefas
Disallow: /orcamento
Disallow: /convidados
Disallow: /meus-fornecedores
Disallow: /favoritos
Disallow: /perfil
Disallow: /meu-plano
Disallow: /meu-casamento
Disallow: /fornecedor/painel
Disallow: /convite/
Disallow: /simulador/resultado
Allow: /
```

Preservar os blocos Googlebot/Bingbot/Twitterbot/facebookexternalhit existentes.

---

### 8. `index.html` — ajustes finais

- Trocar canonical estático para `https://www.casamenteiro.com.br/` (hoje aponta para `ocasamenteiro.lovable.app`).
- Manter `og:image` global.
- Adicionar `<meta property="og:site_name" content="Casamenteiro" />` e `<meta property="og:url" content="https://www.casamenteiro.com.br/" />` como fallback.

---

### Arquivos

**Novos**
- `src/lib/seo.ts` — helpers (`SITE_URL`, `absoluteUrl`, `breadcrumbJsonLd`, `truncate`).
- `scripts/generate-sitemap.ts` — gerador do `public/sitemap.xml`.

**Editados**
- `src/pages/Home.tsx` — canonical absoluto.
- `src/pages/Explore.tsx`, `src/pages/SupplierSearch.tsx` — SEO dinâmico + ItemList + Breadcrumb.
- `src/pages/SupplierProfile.tsx` — Breadcrumb, additionalProperty, image[], geo, priceRange, canonical absoluto.
- `src/pages/SupplierLanding.tsx` — SEO + JSON-LD `Service`.
- `src/pages/Simulador.tsx`, `src/pages/SimuladorResultado.tsx` — SEO (resultado com `noIndex`).
- `src/pages/Termos.tsx`, `src/pages/Privacidade.tsx` — SEO básico.
- `src/pages/Auth.tsx`, `src/pages/EsqueciSenha.tsx`, `src/pages/RedefinirSenha.tsx`, `src/pages/SupplierOnboarding.tsx`, `src/pages/EmailConfirmado.tsx` — SEO com `noIndex`.
- `src/pages/NotFound.tsx`, `src/pages/CoupleOnboarding.tsx`, `src/pages/CoupleDashboard.tsx`, `src/pages/WeddingTasks.tsx`, `src/pages/WeddingGuests.tsx`, `src/pages/WeddingPlan.tsx`, `src/pages/MySuppliers.tsx`, `src/pages/Favorites.tsx`, `src/pages/UserProfile.tsx`, `src/pages/MeuPlano.tsx`, `src/pages/SupplierDashboard.tsx`, `src/pages/InviteRSVP.tsx`, `src/pages/InviteObrigado.tsx` — SEO `noIndex` (1 linha).
- `src/components/admin/AdminLayout.tsx` — SEO `noIndex` global.
- `public/robots.txt` — Sitemap + Disallows.
- `index.html` — canonical/og:url no domínio oficial.
- `package.json` — scripts `predev`/`prebuild`.

---

### Fora de escopo

- SSR/pre-rendering (LinkedIn/Slack continuam vendo só o head estático de `index.html`).
- og:image dinâmico por fornecedor server-side (Helmet client-side já cobre Googlebot; previews sociais usam o og:image global).
- `react-helmet-async`: o `SEO.tsx` atual já cumpre o papel sem dependência extra.