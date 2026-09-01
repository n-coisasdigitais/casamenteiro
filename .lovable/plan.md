# Cookies: "Aceitar todos" + "Apenas necessários" (sem rejeitar)

Modelo comum em sites modernos: o banner não some sem uma escolha, e mesmo "só os necessários" ainda deixa o GA4 contar a visita via **pings sem cookie** (Consent Mode negado), capturando a entrada da página inicial sem instalar nada no navegador do visitante.

## Mudanças

1. **Banner (`src/components/CookieConsent.tsx`)**
   - Remover o botão "Rejeitar".
   - Dois botões: **"Aceitar todos"** (granted — medição completa com cookies) e **"Apenas necessários"** (denied — sem cookies, só pings de consentimento).
   - Texto ajustado explicando que os necessários garantem o funcionamento e a contagem anônima de visitas.
   - Link da Política de Privacidade mantido.

2. **Lógica de consentimento (`src/lib/analytics.ts`)**
   - Quando o usuário escolhe "Apenas necessários": salvar como `denied` e disparar `gtag('consent','update', ...)` com `analytics_storage: denied` — o GA4 continua recebendo pings agregados/anônimos (page_view sem cookie), então a **entrada na home é capturada** no relatório em tempo real e nas métricas modeladas.
   - Quando aceita tudo: `granted`, medição completa como hoje.
   - Sem mudança no Consent Mode default do `index.html` (já inicia negado — correto e conforme LGPD).

3. **Sem regressões**
   - `CookiePreferencesLink` no rodapé continua reabrindo o banner para trocar a escolha.
   - Deduplicação de eventos e page_view por rota inalterados.

## Detalhes técnicos

- Arquivos alterados: apenas `src/components/CookieConsent.tsx` (UI/botões/texto) e um pequeno ajuste de comentário/nome em `src/lib/analytics.ts` se necessário — a função `setConsent` já aceita `"granted" | "denied"`.
- Nada muda no banco de dados, edge functions ou rotas.
- Textos em pt-BR, tokens do design system (sem cores hardcoded).

## Observação de conformidade

"Rejeitar" sai, mas "Apenas necessários" cumpre o mesmo papel legal (não instala cookies de analytics). A visita é contada de forma anonimizada via Consent Mode — exatamente o comportamento dos modelos de site que você viu.
