# Ajustes Gerais

## 1. Mensagens de erro em português

Hoje vários pontos mostram o texto cru do backend em inglês (ex.: "Invalid login credentials", "duplicate key value violates unique constraint").

- Criar `src/lib/errors.ts` com `traduzirErro(error)`: mapeia os erros mais comuns de autenticação (credenciais inválidas, e-mail já cadastrado, e-mail não confirmado, senha fraca, muitas tentativas), de banco (registro duplicado, permissão negada, campo obrigatório, violação de referência) e de rede/timeout para frases claras em pt-BR, com fallback genérico ("Não foi possível concluir. Tente novamente.") em vez de expor o texto técnico.
- Substituir os usos de `error.message` nos toasts das telas principais (login/cadastro, onboardings de casal, fornecedor e profissional, perfil, orçamento, convidados, vagas, pagamentos, telas de admin) por `traduzirErro(error)`.
- Revisar mensagens de sucesso e de validação de formulário para o mesmo tom em pt-BR.

## 2. Notificação por e-mail de vagas compatíveis

- Estender o gatilho existente que avisa profissionais sobre novas vagas para também enfileirar e-mail, respeitando a compatibilidade por **função** e **cidade** do perfil do profissional.
- O e-mail sai pelo Resend (mesma infraestrutura já usada), com template em pt-BR e botão para a vaga.
- Preferência do profissional: novo campo "receber e-mails de vagas" no perfil/painel, ligado por padrão, para permitir desativar.
- Registro no log de e-mails já existente, para acompanhamento no admin.

## 3. Cidades padronizadas (autocomplete obrigatório)

Já existe o componente de autocomplete de cidades (base IBGE) usado no simulador e na área de atuação do fornecedor, mas vários formulários ainda usam campo de texto livre — daí "BH", "Bhte", "Belo Horizonte".

- Trocar todos os campos de cidade pelo autocomplete com fonte oficial: onboarding do profissional, onboarding/edição do fornecedor, perfil do casal, cadastro e filtros de vagas, e demais formulários com cidade.
- Tornar a seleção obrigatória: o valor só é aceito quando vem de uma sugestão (cidade + UF gravados separadamente); digitação livre não é salva.
- Normalizar na gravação (acentuação e caixa conforme a base oficial).
- Migração de dados: normalizar as cidades já cadastradas casando por texto sem acento/caixa com a base de municípios; casos ambíguos ficam listados para revisão na tela de cidades do admin.

## 4. Links no domínio próprio

- Centralizar a URL pública em `src/lib/appUrl.ts` (`https://www.casamenteiro.com.br`) e usar em todos os links compartilháveis: convites, perfil público do casal, indicações, avaliações e links copiados/WhatsApp.
- Remover o fallback `ocasamenteiro.lovable.app` de `WeddingGuests.tsx` e os `lovable.app` usados como origem nas Edge Functions (`mp-checkout`, `mp-checkout-split`, `oauth-calendar-callback`, `auth-email-hook`), passando a usar a variável `APP_PUBLIC_URL` com o domínio próprio.
- Os links dentro de e-mails (inclusive o de avaliação) passam a apontar sempre para o domínio próprio.

## 5. Renomear "Meu Grande Dia" para "Casamenteiro"

- Substituir o nome em todos os textos visíveis: títulos SEO (status de pagamento, minhas reservas, pagamento, planos, faturas, comprovante), comprovante de pagamento, e-mails, termos, privacidade e demais páginas.
- Contas de teste com e-mail `@meugrandedia.com` continuam como estão (são credenciais existentes); apenas os rótulos visíveis mudam.

## Observação

Confirme se o "link da avaliação" citado é o enviado por e-mail após a contratação — o ajuste acima cobre todos os links gerados por e-mail e pela interface.