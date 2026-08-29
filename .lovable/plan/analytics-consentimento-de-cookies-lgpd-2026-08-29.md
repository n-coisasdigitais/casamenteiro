# Analytics + Consentimento de Cookies (LGPD)

Integração do Google Analytics 4 em 3 camadas, com banner de cookies usando Google Consent Mode v2 e tracking dos eventos do funil por um helper único.

## O que será entregue

1. **Banner de consentimento** (pt-BR, canto inferior, não bloqueia navegação)
   - Botões "Aceitar", "Rejeitar" e link para a Política de Privacidade.
   - Escolha salva em `localStorage` (`cs_consent`, versionada) — o banner some após a decisão.
   - Componente reaberto por um link "Preferências de cookies" no rodapé, para o usuário mudar de ideia.

2. **Google Consent Mode v2**
   - A tag do GA carrega no primeiro acesso já em modo negado (`analytics_storage: denied`, `ad_storage: denied`, `ad_user_data: denied`, `ad_personalization: denied`), sem gravar cookies.
   - Ao aceitar, dispara `gtag('consent','update', ...)` liberando `analytics_storage` — a medição completa passa a valer sem recarregar a página.
   - Ao rejeitar, permanece negado (só dados agregados/sem cookie).

3. **As 3 camadas**
   - **Camada 1 — `index.html`**: apenas o bootstrap `dataLayer` + default do Consent Mode + o snippet `gtag.js`. Fora da árvore React, então nenhuma mudança de componente/rota afeta a medição.
   - **Camada 2 — `src/lib/analytics.ts`**: único arquivo que o app importa. Expõe `trackEvent`, `trackPageView`, `setConsent`, `getConsent`. Se a tag não existir (preview local sem ID), vira no-op silencioso.
   - **Camada 3 — `src/components/SEO.tsx`**: cada troca de rota dispara `page_view` com `page_path`, `page_title` e `page_location`, já com o título correto da página (evita o page_view genérico do SPA).

4. **Eventos do funil** (nomes GA4, snake_case)
   - `sign_up` — cadastro concluído (casal, fornecedor, profissional; com `method` e `user_type`).
   - `login` — login bem-sucedido (`method`).
   - `onboarding_complete` — fim do onboarding (`user_type`).
   - `form_submit` — envio de formulário (simulador, orçamento, vaga, perfil; com `form_name`).
   - `contact_cta_click` — clique no CTA de contato/WhatsApp/pedir orçamento (com `supplier_id`, `origem`).

5. **Deduplicação**
   - `trackEvent(name, params, { dedupeKey, scope })` mantém um `Set` em memória + `sessionStorage` para eventos "uma vez por sessão/ação".
   - Eventos de conversão (`sign_up`, `onboarding_complete`) são once-per-session; cliques de CTA são deduplicados por 2s para evitar duplo clique.
   - `page_view` é deduplicado por path (não redispara em re-render, só em mudança real de rota).

6. **Search Console**
   - Já validado por DNS: nada a alterar no código. Confirmo que `sitemap.xml` e `robots.txt` estão coerentes com o domínio `www.casamenteiro.com.br` para você submeter o sitemap no painel.

## O que preciso de você

O **measurement ID** do GA4 (formato `G-XXXXXXXXXX`). Sem ele eu deixo o ID em uma constante única (`src/lib/analytics.ts`) e a tag fica inativa até você colar.

## Onde inserir scripts no futuro

| Tipo de script | Onde | Por quê |
| --- | --- | --- |
| Tags de terceiros (Meta Pixel, Hotjar, Clarity, LinkedIn, TikTok) | `index.html` no `<head>`, logo abaixo do bloco GA | Fora do React; nenhuma refatoração de componente quebra |
| Fallback `<noscript>` de pixels | `index.html` no início do `<body>` | HTML5 não permite `<img>` em `<noscript>` no `<head>` |
| Lógica de disparo/consentimento | `src/lib/analytics.ts` | Único ponto de manutenção; adicionar ferramenta = adicionar função aqui |
| Eventos de página/rota | `src/components/SEO.tsx` | Já roda em toda página |
| Scripts que dependem de consentimento | Carregados dinamicamente pelo `analytics.ts` após "Aceitar" | Não instala cookie antes da escolha |

## Detalhes técnicos

- Arquivos novos: `src/lib/analytics.ts`, `src/components/CookieConsent.tsx`, `src/hooks/useConsent.ts`.
- Arquivos alterados: `index.html` (bloco GA + Consent Mode), `src/App.tsx` (montar `<CookieConsent />` uma vez), `src/components/SEO.tsx` (page_view), e os pontos de funil: fluxos de cadastro/login em `AuthContext`/páginas de auth, onboarding (casal, fornecedor, profissional), simulador e o CTA de contato do perfil do fornecedor.
- Banner usa os tokens do design system existente (sem cores hardcoded) e textos em pt-BR.
- Tipagem `window.gtag`/`window.dataLayer` declarada em `analytics.ts`, sem `any` espalhado.
