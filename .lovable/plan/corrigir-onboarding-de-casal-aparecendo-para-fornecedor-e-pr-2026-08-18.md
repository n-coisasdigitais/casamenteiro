# Corrigir onboarding de casal aparecendo para fornecedor e profissional

## O que está acontecendo (verificado)

- A página `/confirmado` (pouso após clicar no link de confirmação de e-mail) decide o destino olhando **apenas** a tabela de casais: se não houver onboarding de casal concluído, manda todo mundo para `/onboarding`, que é o formulário do casal. Fornecedores e profissionais caem lá porque nunca terão registro de casal.
- A rota `/onboarding` não tem nenhuma proteção de tipo de conta — qualquer usuário logado abre o formulário do casal.
- O gatilho de criação de conta no banco já cria o registro certo por tipo (casal / fornecedor / profissional), e a tela de login já redireciona corretamente por tipo. Ou seja, o cadastro em si está certo; o problema é só o pouso pós-confirmação e a rota desprotegida.
- Nas contas existentes: `fornecedor.teste` está com tipo "fornecedor" e registro de fornecedor corretos. Existem duas contas antigas chamadas "Prestador Caju" gravadas como casal — foram criadas pelo formulário de casal, não por bug do gatilho.

## Correções

1. **Pouso pós-confirmação de e-mail (`/confirmado`)**: passar a ler o tipo da conta antes de decidir o destino.
   - Fornecedor: painel do fornecedor, ou o cadastro do fornecedor se ainda não concluído.
   - Profissional: painel do profissional, ou o onboarding do profissional se faltar cidade/consentimento.
   - Casal: comportamento atual (simulação pendente → resultado; senão onboarding ou painel).
   - Admin: painel admin.
2. **Proteger `/onboarding`**: envolver a rota na mesma guarda de tipo de conta já usada nas outras telas do casal, para que fornecedor/profissional sejam redirecionados ao painel deles em vez de ver o formulário do casal.
3. **Modal de boas-vindas por tipo de conta** (leve, sem tour guiado): ao entrar no painel pela primeira vez, um modal em pt-BR com 3–4 pontos explicando o que fazer ali.
   - Fornecedor: completar perfil, receber orçamentos/leads, agenda e datas ociosas, planos e assinatura.
   - Profissional: completar perfil, ver vagas, candidatar-se, chat e avaliações.
   - Exibido uma vez por conta (marcado no navegador), com botão "Entendi" e link para reabrir depois.
4. **Contas antigas de teste**: opcionalmente corrigir manualmente o tipo das contas criadas erradas ("Prestador Caju") via ajuste pontual no banco — só se você quiser mantê-las.

## Detalhes técnicos

- `src/pages/EmailConfirmado.tsx`: usar `profile.account_type` do contexto de autenticação (ou consulta direta ao perfil) e replicar a árvore de decisão já existente em `src/pages/Auth.tsx`.
- `src/App.tsx`: rota `/onboarding` passa a usar o wrapper `Casal` (`RequireAccountType allow={["couple","admin"]}`).
- Novo componente `src/components/WelcomeModal.tsx` (conteúdo por tipo), usado em `SupplierDashboard.tsx` e `StaffDashboard.tsx`, com chave em `localStorage` por usuário.
