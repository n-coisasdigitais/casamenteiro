## Objetivo

Reconstruir `src/pages/SupplierLanding.tsx` (`/fornecedor`) com a estrutura nova do briefing, **mantendo `WhyTimeline` intacto** entre "Como funciona" e "Depoimentos".

## Estrutura final da página

```
VendorNavbar (fixo)
VendorHero (vídeo + CTA)
HowItWorksSection (spotlight 3 passos com auto-advance)
WhyTimeline           ← já existe, só importar
TestimonialsSection (wall of love + carrossel)
VendorCTASection (form de email)
Rodapé existente
```

## Arquivos novos

Todos em `src/components/supplier/landing/`:

1. **`VendorNavbar.tsx`** — fixed, backdrop-blur escuro, logo + botão "Anuncie grátis →" (cor primária). Listener de scroll: a partir de 80px adiciona `border-b border-white/10`.

2. **`VendorHero.tsx`** — `<section>` 100vh com `<video autoPlay muted loop playsInline>` (prop `videoSrc?`, fallback gradient escuro). Overlays: gradient linear escuro + radial sutil terracotta na base. Conteúdo centralizado com framer-motion (fade+translateY, stagger 0.2s):
   - pill "Para fornecedores"
   - H1 "Leve seu negócio para quem quer **casar**." (palavra "casar" em `italic` com tom terracotta claro)
   - parágrafo branco/65%
   - botões: `Quero me cadastrar →` (primário pill com shadow) → `/fornecedor/cadastro`; `Como funciona` (outline branco) faz scroll suave para `#como-funciona`
   - link "Já tenho cadastro" → `/fornecedor/login`
   - scroll indicator absoluto com bounce infinito

3. **`HowItWorksSection.tsx`** — id `como-funciona`, fundo `bg-secondary`. Grid 2 colunas desktop / coluna única mobile, max-w 960px.
   - Header centralizado (tag + H2 + subtítulo).
   - Esquerda: lista de 3 passos com estado ativo (bg branco, shadow, dot primário, descrição expandindo via framer `AnimatePresence` com `height: auto`) e inativo (muted, dot cinza).
   - Direita: card sticky `top-24`, `aspect-[4/3]`, conteúdo (emoji + texto) trocando com fade+scale via `AnimatePresence mode="wait"`. Barra de progresso na base anima 0→100% em 4s (key reseta a cada troca).
   - Auto-advance: `setInterval` 4000ms; clique reseta o timer (state `tick`).

4. **`TestimonialsSection.tsx`** — fundo `bg-background`. Header com H2 "Wall of love 💛" (love em `italic text-primary`), linha de rating.
   - Carrossel 1-slide via `translateX` (`transition cubic-bezier(0.4,0,0.2,1)` 500ms). Card branco com aspas decorativas grandes em primary/15.
   - Avatar nav (emoji circles, `-ml-2.5` overlap, ativo `scale-115` + ring primário).
   - Botões ← → outline circulares.
   - Auto-advance 5s, pausa em hover.
   - Aceita prop `testimonials?: Testimonial[]` (4 exemplos hardcoded como fallback).

5. **`VendorCTASection.tsx`** — fundo escuro (mesmo tom do hero, ex.: `#2C2420`). Form inline (input pill translúcido + botão primário). Submit (e Enter) → `navigate('/fornecedor/cadastro?email=' + encodeURIComponent(email))` via `react-router-dom`. Linha de garantias abaixo (`✓ Gratuito · ✓ 24h · ✓ Sem surpresas`).

6. **`useScrollReveal` inline (helper)** — não criar arquivo separado; cada seção usa `useInView` do framer-motion direto, `once: true`, margin `-15%`.

## Edição em `src/pages/SupplierLanding.tsx`

- Remover hero, "Como funciona", depoimento e CTA atuais.
- Manter `<WhyTimeline />` no slot correto.
- Manter `<SEO>` e o rodapé atual.
- Substituir o navbar pelo `VendorNavbar`.
- Composição final:
  ```tsx
  <SEO ... />
  <VendorNavbar />
  <main>
    <VendorHero />
    <HowItWorksSection />
    <WhyTimeline />
    <TestimonialsSection />
    <VendorCTASection />
  </main>
  <footer>...</footer>
  ```

## Detalhes técnicos

- **Tipografia**: o projeto só tem `Inter` (mapeado em `font-sans`/`font-serif`/`font-display`). Usar `font-serif` para H1/H2/H3 e classes utilitárias para corpo, igual ao restante da SupplierLanding atual e ao `WhyTimeline` recém-criado.
- **Cores**: usar tokens (`bg-primary`, `text-primary`, `text-primary-foreground`, `bg-background`, `bg-secondary`, `text-muted-foreground`, `border-border`). Para o dark do hero/CTA, usar `bg-[hsl(var(--color-dark))]` (token já existe em `index.css`) em vez de hex.
- **Animações**: `framer-motion` (já instalado). Bounce do scroll indicator via Tailwind `animate-bounce` ou keyframe inline.
- **Acessibilidade**: `aria-hidden` no scroll indicator; `aria-label` nos botões ← →; vídeo `muted playsInline`; alt nos avatares quando `avatarUrl`.
- **Sem novas dependências, sem novas fontes, sem mexer no `WhyTimeline`.**

## Fora do escopo

- Páginas `/fornecedor/cadastro` e `/fornecedor/login` (já existem).
- Captura real de email no backend — apenas redireciona com query string.
- Substituir vídeo/imagens reais — placeholders ficam para troca posterior via prop.
