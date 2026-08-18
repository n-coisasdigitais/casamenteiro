# Ajustes gerais de e-mail (Resend + domínio próprio)

## Situação atual
- Os e-mails de autenticação (confirmação, redefinição, magic link) saem pelo caminho da Lovable: a função `auth-email-hook` renderiza o template e joga numa fila interna da Lovable, que faz o envio. O domínio de envio da Lovable foi removido, então hoje o remetente cai no padrão da Lovable.
- A função de e-mails transacionais usa o Resend, mas via gateway da Lovable e com remetente padrão `onboarding@resend.dev`.
- Os textos dos templates ainda estão em inglês ("Confirm your email", etc.).
- Os templates usam fundo claro sem proteção de modo escuro, por isso ficam ilegíveis em celulares no modo noturno.
- Observação importante: hoje só `www.casamenteiro.com.br` está ativo; `casamenteiro.com.br` (sem www) consta como não publicado. Os links usarão a raiz assim que ela estiver ativa; enquanto isso, aponto para o domínio ativo para não gerar links quebrados.

## O que será feito

### 1. Credenciais e remetente
- Guardar a nova chave da API do Resend como segredo (`RESEND_API_KEY`) e o remetente como `RESEND_FROM = "Casamenteiro <contato@casamenteiro.com.br>"`.
- Você ainda precisa verificar/confirmar o domínio `casamenteiro.com.br` na nova conta Resend (SPF/DKIM) — sem isso o Resend recusa o envio.

### 2. Envio 100% pelo Resend
- Reescrever `send-transactional-email` para chamar a API do Resend diretamente (`https://api.resend.com/emails`), sem gateway, usando a nova chave e o remetente padrão.
- Reescrever `auth-email-hook` para, em vez de enfileirar na infraestrutura da Lovable, enviar direto pelo Resend com o mesmo remetente. Mantém-se o registro em `email_send_log` (pendente / enviado / falhou) para o painel `/admin/emails` continuar funcionando.
- Ajustar `send-invite-emails` e demais pontos de disparo para usarem o mesmo caminho.

### 3. Links com o seu domínio
- Os links de confirmação hoje passam pelo endereço técnico do backend. Vou reescrevê-los para o seu domínio, no formato `https://casamenteiro.com.br/auth/confirmar?token_hash=...&type=...` (com fallback para `www` enquanto a raiz não estiver ativa).
- Criar/ajustar a rota de confirmação no app para validar o token e concluir login/redefinição, reaproveitando a lógica de `EmailConfirmado.tsx`.
- Configurar Site URL e URLs de redirecionamento da autenticação para o domínio próprio.

### 4. Templates legíveis no modo escuro
- Os templates ficam configurados **aqui no projeto** (arquivos em `supabase/functions/_shared/email-templates/`), não no Resend. O Resend só entrega.
- Correções em todos os 6 templates:
  - `<meta name="color-scheme" content="light only">` e `supported-color-schemes`, evitando a inversão automática do iOS/Gmail.
  - Cores explícitas em cada elemento de texto (nada de herdar), fundo branco fixo, botão com cor de fundo e texto definidos inline.
  - Bordas visíveis em vez de contraste só por sombra; logo/ícone que não some em fundo escuro.
  - Versão em texto puro coerente.
- Traduzir todos os assuntos e conteúdos para pt-BR e aplicar a identidade da marca (terracota/sage, Inter, botões pill).

### 5. Sugestões extras já incluídas
- Cabeçalho `Reply-To` para um endereço monitorado.
- Retentativa automática em falha temporária (429/5xx) do Resend, com registro do erro no log.
- Página `/admin/emails` passa a mostrar também os e-mails de autenticação enviados pelo novo caminho.

## Detalhes técnicos
- Segredos: `RESEND_API_KEY` (form seguro), `RESEND_FROM`, `APP_URL`.
- Funções alteradas: `auth-email-hook`, `send-transactional-email`, `send-invite-emails`, `send-bulk-supplier-emails`.
- `process-email-queue` deixa de ser usada pelo fluxo de autenticação (fica inativa, sem remoção).
- Templates: React Email com estilos inline; sem `<style>` externo e sem `dangerouslySetInnerHTML`.
