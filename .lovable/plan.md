# Correções no fluxo de cadastro, simulador e plano

## Problemas identificados

1. **Erro `Estilo inválido: Médio e elegante`** (itens 4 e 6): o `SimulatorCTA` salva `estilo` como rótulo bonito (`"Médio e elegante"`), mas `calcularSimulacao` espera o enum interno (`"elegante"`). Ao reabrir a página de resultado sem snapshot válido, ela tenta recalcular e estoura, deixando o loading infinito.

2. **Mensagens do login em inglês** (item 1): os erros de `supabase.auth` vêm em inglês (`Invalid login credentials`, etc.). Não há mapeamento para português.

3. **E-mail de confirmação em inglês** (itens 2, 3, 5): hoje usamos o template padrão da Lovable (em inglês), e o link cai na raiz `/` sem feedback. Precisamos de templates em português + página de sucesso `/confirmado` com timer e redirecionamento inteligente.

4. **Onboarding redundante** (item 9): mesmo quem simulou (orçamento, convidados, cidade, estilo, data) responde tudo de novo. O onboarding deve pular o que já temos e ir direto pro orçamento preenchido / plano.

5. **Termos e Política** (item 7): os arquivos já estão como "Casamenteiro", mas o **e-mail padrão** ainda diz "Meu Grande Dia". Trocando os templates resolve.

6. **Título do onboarding** (item 8): não define `document.title`; cabeçalho visual genérico.

---

## Mudanças propostas

### 1. Corrigir o estilo do simulador (resolve itens 4 e 6)

- Em `src/components/home/SimulatorCTA.tsx`, mudar os IDs de `STYLES` para os enums internos:
  - `"intimista"`, `"elegante"`, `"grandioso"` (em vez dos rótulos longos).
- Garantir que `payload.estilo` salvo em `home_simulacoes.estilo` seja sempre um dos três enums.
- Em `src/lib/simulador.ts` `calcularSimulacao`: tornar tolerante — se `estilo` vier desconhecido, faz fallback para `"elegante"` (em vez de `throw`), evitando travar a tela.
- Migration leve: `UPDATE home_simulacoes SET estilo = CASE WHEN estilo ILIKE 'simples%' THEN 'intimista' WHEN estilo ILIKE 'grande%' THEN 'grandioso' WHEN estilo ILIKE 'médio%' THEN 'elegante' ELSE estilo END` para sanear linhas antigas.

### 2. Mensagens de login em português (item 1)

- Em `src/pages/Auth.tsx`, criar um `traduzirErroAuth(error)` que mapeia mensagens conhecidas:
  - `Invalid login credentials` → "E-mail ou senha incorretos."
  - `Email not confirmed` → "Confirme seu e-mail antes de entrar."
  - `User already registered` → "Este e-mail já está cadastrado."
  - `Password should be at least 6 characters` → "A senha deve ter pelo menos 6 caracteres."
  - genérico → mensagem amigável padrão.
- Aplicar também em `EsqueciSenha.tsx` e `RedefinirSenha.tsx`.

### 3. E-mails de autenticação em português + página de confirmação (itens 2, 3, 5, 7)

- **Configurar templates de e-mail customizados** (Lovable Auth Email Templates) com:
  - Marca **Casamenteiro** (logo, paleta terracota/sage, Inter).
  - Conteúdo 100% em pt-BR.
  - Assuntos: "Confirme seu e-mail no Casamenteiro", "Recupere sua senha", etc.
  - Link de confirmação aponta para `https://<site>/confirmado` (em vez da raiz).
- **Criar `src/pages/EmailConfirmado.tsx`** na rota `/confirmado`:
  - Mostra "E-mail confirmado! 💍" com checkmark.
  - Lê sessão do Supabase (o link de confirmação já loga o usuário).
  - Mostra contador regressivo de 4 segundos.
  - Redireciona conforme estado:
    - se há `pending_simulacao` no localStorage → cria a simulação no banco e vai para `/simulador/resultado?id=...`;
    - senão, se `couples.onboarding_completed = true` → `/dashboard`;
    - senão → `/onboarding`.
  - Botão "Continuar agora" para pular o timer.
- Adicionar rota `/confirmado` em `App.tsx`.

### 4. Onboarding inteligente baseado em simulação (item 9)

- Em `src/pages/CoupleOnboarding.tsx`:
  - Definir `document.title = "Bem-vindos ao Casamenteiro"` e atualizar título visual: "Vamos terminar de configurar seu casamento".
  - No `useEffect` inicial, buscar a simulação mais recente do usuário (`home_simulacoes` por `user_id` ou `couple_id`).
  - Se houver simulação, pré-preencher e **pular** os passos que ela já responde (cidade/orçamento/convidados/estilo/data).
  - O onboarding fica resumido a: papel (noivo/noiva), nome do parceiro, data prevista (se ainda não tiver), serviços desejados.
  - Ao concluir, além de marcar `onboarding_completed`, **criar o plano** automaticamente a partir da simulação (reutilizar `criarPlano`) e redirecionar para `/meu-casamento/plano` (em vez de `/dashboard`).
  - Se não houver simulação, mantém o fluxo atual (4 passos).

### 5. Pequenos ajustes de UX

- Remover o `setTimeout(..., 0)` desnecessário e trocar `.single()` por `.maybeSingle()` em `AuthContext.fetchProfile` (regra do projeto).
- No `SimulatorCTA`, exibir mensagem amigável caso o cálculo falhe (em vez de só toast técnico).

---

## Arquivos afetados

- `src/components/home/SimulatorCTA.tsx` — IDs de estilo + erro amigável.
- `src/lib/simulador.ts` — fallback de estilo.
- `src/pages/Auth.tsx`, `EsqueciSenha.tsx`, `RedefinirSenha.tsx` — tradução de erros.
- `src/pages/EmailConfirmado.tsx` — **novo**.
- `src/App.tsx` — registrar rota `/confirmado`.
- `src/pages/CoupleOnboarding.tsx` — pré-preencher por simulação, criar plano ao final, título.
- `src/contexts/AuthContext.tsx` — `.maybeSingle()`.
- `supabase/functions/auth-email-hook/*` + `_shared/email-templates/*` — templates pt-BR com marca Casamenteiro (via ferramenta de scaffold).
- Nova migration para sanear `home_simulacoes.estilo`.

## Fora do escopo

- Acesso super admin: já configurado em entrega anterior. Se ainda não estiver vendo o painel, o problema é a role `admin` no banco para esse `user_id` — verificável depois do deploy desta correção (não envolve código novo).
