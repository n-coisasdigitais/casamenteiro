# Conta com vários perfis: fornecedor + profissional

## Pontos que divergem do que foi descrito (decidir antes)
1. **prevent_role_conflict hoje não envolve o profissional.** Ela só barra casal ↔ fornecedor. Casal ↔ profissional **não é barrado hoje**. Para cumprir "casal continua exclusivo", a função vai passar a barrar também casal ↔ profissional. Supplier + profissional já é permitido, então nada muda nesse ponto.
2. **Qualquer usuário consegue hoje trocar o próprio `account_type`.** A regra "Users can update own profile" não limita colunas. Com "perfil ativo", isso permitiria ativar um perfil que a conta não possui. Proposta: um gatilho que só aceita mudar `account_type` quando quem chama é o admin ou as RPCs novas. Com isso, o tipo de conta não pode mais ser mudado direto pelo app, nem nas telas atuais.
3. **Perfil "generico" (quiz/mural):** fica fora da combinação, como o casal. Ele não ganha perfil de fornecedor nem de profissional neste envio, e `fiquei_noivo` continua como está.
4. Hoje nenhuma conta tem os dois perfis (0 contas). São 14 fornecedores, 112 profissionais e 9 casais.

## Banco (1 migration)
- `meus_perfis()`: retorna casal, fornecedor e profissional como verdadeiro/falso, conforme a linha existir em `couples`, `suppliers` ou `staff_profiles` do usuário logado.
- `adicionar_perfil(tipo)`: aceita só `supplier` ou `profissional`. Recusa casal, generico, perfil já existente e conta suspensa.
  - Fornecedor: `company_name` vem do nome do profissional; e-mail, telefone, cidade e UF são copiados. Entra no status pendente padrão, com `onboarding_completed=false`.
  - Profissional: `nome` vem do nome do perfil ou da empresa; contato, cidade e UF são copiados.
  - No fim, define `account_type` e registra `perfil_adicionado`.
- `trocar_perfil(tipo)`: só troca se a conta possui o perfil e não está suspensa. Registra `perfil_trocado`.
- Gatilho `profiles_trava_account_type`: barra a mudança do tipo fora do admin e das duas RPCs. As RPCs sinalizam isso com um ajuste local da transação.
- `prevent_role_conflict`: acrescenta o bloqueio casal ↔ profissional nos dois sentidos e mantém casal ↔ fornecedor. `couples_somente_conta_casal` fica como está.
- `admin_broadcast_segmented` / `admin_broadcast_notification`:
  - Os segmentos passam a filtrar pela existência da linha, e não mais pelo `account_type`.
  - "suppliers" = existe em `suppliers`; "profissionais" = existe em `staff_profiles`.
  - "todos" = união dos públicos, sem duplicar a pessoa.
- `admin_buscar_usuarios`: passa a devolver `perfis text[]` com todos os perfis da conta.
- `log_platform_event`, `audit_row`, `admin_quiz_resumo`: só os trechos que contam por tipo passam a usar existência da linha. O que registra "quem agiu" continua usando o perfil ativo.
- Funções novas com SECURITY DEFINER e `search_path=public`, GRANT EXECUTE para authenticated e REVOKE de anon.

## Front
- `AuthContext`: adiciona `perfis` e `trocarPerfil(tipo)`, que chama a RPC, recarrega o perfil e navega. O perfil é recarregado quando a aba volta ao foco.
- `UserMenu`: seletor "Fornecedor / Profissional" com marca no perfil ativo. Só aparece com 2 ou mais perfis. Destinos: fornecedor vai para `/fornecedor/painel` e profissional para `/profissional/painel`.
- `SupplierDashboard` e `StaffDashboard`: card de chamada com o texto pedido. O clique chama `adicionar_perfil` e abre o onboarding existente, já com os dados copiados.
- `RequireAccountType`: se a conta possui o perfil da rota mas está em outro, mostra "Você está no perfil X. Trocar para perfil Y" com botão, em vez de redirecionar.
- `Auth.tsx`: quando o erro for de e-mail já cadastrado, mostra "Você já tem conta. Entre e adicione o perfil de fornecedor ou profissional no seu painel", com botão Entrar. A lógica do resto fica igual.
- `EmailConfirmado.tsx`: só confere se continua correto com o perfil ativo. Se nada precisar mudar, não é alterado.
- Admin › Usuários (`AdminUsuarios` ou o equivalente que usa `admin_buscar_usuarios`): selos de todos os perfis da conta.

## Testes
Testes automáticos de banco, rodados com contas criadas e removidas no fim:
- profissional adiciona fornecedor e aparece pendente na fila de aprovação;
- casal recebe recusa ao adicionar perfil;
- conta suspensa não troca de perfil;
- broadcast "fornecedores" alcança quem tem os dois perfis;
- não dá para mudar `account_type` direto pelo app.

Teste de tela (Vitest): o seletor só aparece com 2 ou mais perfis; e-mail já cadastrado mostra a orientação. A troca levando ao painel certo será conferida no navegador, se for possível entrar com uma conta de teste.

## Arquivos
- `supabase/migrations/<novo>.sql`
- `src/contexts/AuthContext.tsx`
- `src/components/UserMenu.tsx`
- `src/components/RequireAccountType.tsx`
- `src/pages/Auth.tsx`
- `src/pages/SupplierDashboard.tsx`
- `src/pages/StaffDashboard.tsx`
- página de usuários do admin
- `src/pages/EmailConfirmado.tsx` (só se for preciso)
- testes novos em `src/test/`

## SQL previsto (resumo)
```text
create function meus_perfis() returns table(casal bool, fornecedor bool, profissional bool)
create function adicionar_perfil(tipo text) returns void
create function trocar_perfil(tipo text) returns void
create function profiles_trava_account_type() + trigger before update on profiles
create or replace prevent_role_conflict  (+ casal <-> profissional)
create or replace admin_broadcast_segmented / admin_broadcast_notification / admin_buscar_usuarios
revoke ... from anon; grant execute ... to authenticated
```
