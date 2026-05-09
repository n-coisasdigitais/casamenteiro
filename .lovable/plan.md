
# Parte 1 — Landing do fornecedor + entrada na home

Esta é a primeira parte do plano de cadastro de fornecedores. Foco somente em **vitrine e entrada**: ainda não vamos mexer no banco, no onboarding, no painel ou no admin. O objetivo é deixar a porta de entrada pronta para o fornecedor.

## O que será entregue

1. **Botão "Sou fornecedor →" na navbar da home**, ao lado do "Entrar".
2. **Nova página `/fornecedor`** — landing longa de venda para o fornecedor.
3. **Nova rota `/fornecedor/login`** — reaproveita a tela de login existente (`Auth.tsx`) preparada para o contexto de fornecedor (título e CTA voltados a quem é fornecedor; redireciona logado para `/fornecedor/painel`).
4. **Botões da landing** apontam para `/fornecedor/cadastro` (rota ainda não criada — ficará como placeholder "Em breve" até a Parte 3) e para `/fornecedor/login`.

## Estrutura da landing `/fornecedor`

Página longa, fundo `#FAF7F2`, mesma identidade visual já usada no projeto (Inter, paleta terracota + sage, botões pill, cards radius 14px).

```text
┌──────────────────────────────────────────────────┐
│ Navbar: Logo Casamenteiro    [Já tenho cadastro] │
├──────────────────────────────────────────────────┤
│  HERO (85vh, fundo escuro #2C2420 com overlay)   │
│  "Leve seu negócio para quem quer casar."        │
│  Subtexto + 2 CTAs (Cadastrar / Já tenho cadast.)│
├──────────────────────────────────────────────────┤
│  COMO FUNCIONA — 3 passos em cards horizontais   │
├──────────────────────────────────────────────────┤
│  BENEFÍCIOS — grid 2x2 de 4 cards                │
├──────────────────────────────────────────────────┤
│  DEPOIMENTO — fundo #F0E8DF, citação + autor     │
├──────────────────────────────────────────────────┤
│  CTA FINAL — "Pronto para aparecer?" + botão     │
├──────────────────────────────────────────────────┤
│  Rodapé simples — logo + © + Privacidade         │
└──────────────────────────────────────────────────┘
```

Responsivo mobile-first; no mobile os grids viram coluna única.

## Detalhes técnicos

- **Novo arquivo**: `src/pages/SupplierLanding.tsx` com as 6 seções acima.
- **Edição**: `src/components/home/HomeNavbar.tsx` — adicionar link discreto "Sou fornecedor →" antes do bloco Entrar/Simular (oculto em telas muito pequenas via `hidden sm:inline`).
- **Edição**: `src/App.tsx` — registrar:
  - `/fornecedor` → `SupplierLanding`
  - `/fornecedor/login` → `Auth` (mesmo componente atual; ele detecta a rota via `useLocation` e ajusta título/CTA + define `redirectTo = /fornecedor/painel`)
- **Pequena edição** em `src/pages/Auth.tsx` para ler `pathname.startsWith("/fornecedor")` e personalizar copy + redirect.
- **CTA "Quero me cadastrar"** aponta para `/fornecedor/cadastro`. Como essa rota ainda não existe (Parte 3), criamos um placeholder mínimo na rota `*` ou adicionamos uma rota temporária `/fornecedor/cadastro` que renderiza um componente "Em breve, abrindo cadastro" com link para login. **Decisão padrão**: criar `SupplierSignupComingSoon` simples para evitar 404, e substituí-lo na Parte 3.
- SEO: `<SEO>` com title "Casamenteiro — Para fornecedores" e meta description focada em leads qualificados.

## Fora do escopo desta parte

- Onboarding step-by-step (Parte 3)
- Tabelas `campos_categoria`, `fornecedor_campos`, `fornecedor_aprovacoes` e seed (Parte 2)
- Refazer `/fornecedor/painel` e `/admin/fornecedores` (Parte 4/5)
- Configurador `/admin/campos` (Parte 4)

Após aprovado, sigo direto para implementação desta Parte 1.
