## Objetivo

Substituir a seção "Por que estar no Casamenteiro?" em `src/pages/SupplierLanding.tsx` por uma **timeline animada** com revelação por scroll, mantendo a tipografia e tokens de cor já existentes no projeto.

## Escopo

- **Apenas** a seção de benefícios da página `/fornecedores` (SupplierLanding).
- Hero, "Como funciona", depoimento, CTA final e rodapé permanecem inalterados.
- Sem novas fontes, sem novas dependências (framer-motion já está instalado).

## Mudanças

### 1. Novo componente `src/components/supplier/WhyTimeline.tsx`
- Exporta `WhyTimeline` (seção completa) + `TimelineItem` interno.
- 4 itens fixos (Leads qualificados, Datas ociosas, Zero risco, Visibilidade real) com placeholders `<img>` em `aspect-[4/3]` e `bg-muted/20` — fácil de trocar por screenshots reais depois.
- Animação por item via `useInView({ once: true, margin: '-80px' })`:
  - Linha vertical: `scaleY 0 → 1`, `origin-top`
  - Dot: spring scale `0 → 1`
  - Texto e imagem deslizam de lados opostos (alterna ímpar/par)
- Grid: `1fr 60px 1fr` em desktop. Em mobile (`<md`), colapsa em coluna única (imagem em cima, texto embaixo, sem trilho central) para legibilidade.

### 2. Edição em `src/pages/SupplierLanding.tsx`
- Remover o bloco `BENEFITS` e a `<section>` correspondente.
- Importar e renderizar `<WhyTimeline />` no lugar.
- Remover o ícone `BarChart3`/`Sparkles`/`Calendar`/`ShieldCheck` do import se não usados em outro lugar da página.

## Detalhes técnicos

- **Tipografia**: o projeto usa `Inter` para tudo (sans/serif/display) via `tailwind.config.ts`. Replicar o padrão da página: `font-serif` em títulos, classes utilitárias (`text-sm opacity-70`, `uppercase tracking-wider opacity-50`) em labels e corpo. Não usar `font-heading`/`font-body` (não existem no projeto).
- **Cores**: usar tokens do tema (`bg-primary`, `border-primary`, `text-muted-foreground`, `bg-background`, `bg-muted`) em vez dos hex inline da página atual, para manter coerência com o design system.
- **Container**: `max-w-[1000px]`, `py-24`, fundo `bg-background` (mesma estética da seção atual).
- **Acessibilidade**: `alt` descritivo nos placeholders; `prefers-reduced-motion` respeitado pelo framer-motion automaticamente.
- **Imagens**: usar URLs Unsplash temáticas como placeholder até receber os screenshots reais.

## Fora do escopo

- Não mexer em outras páginas.
- Não trocar fontes globalmente.
- Não alterar lógica/back-end.
