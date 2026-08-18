# Vagas públicas + checkout de assinatura em sandbox

## Problema 1 — A página de vagas não abre para ninguém

A página `/vagas` existe como arquivo (`src/pages/Vagas.tsx`) mas **não está registrada como rota** no roteador do app. Hoje, qualquer acesso a `/vagas` cai na página "não encontrada" — inclusive logado. Os links "Ver todas →" na landing do profissional apontam para uma rota inexistente.

### O que fazer
- Registrar a rota pública `/vagas` apontando para a página de vagas, **sem exigir login** e **sem o portão de login/tipo de conta** usado nas áreas internas.
- Manter apenas o controle por chave de recurso ("vagas"), que já está ligada, para o admin poder desligar a vitrine se quiser.
- Conferir que a leitura das vagas funciona deslogado (a regra de acesso pública já permite vagas com `is_public = true` e status "aberta"); se o teste deslogado retornar vazio, ajustar a permissão de leitura anônima na mesma passada.
- Verificar navegação: link para `/vagas` na landing do profissional e no rodapé/menu público, para a vitrine ser encontrável.
- Candidatar-se continua exigindo login (envia para cadastro de profissional) — sem mudança.

## Problema 2 — Assinatura no modo demo "cai" no Mercado Pago de produção

Verificação feita no banco: as contas demo estão com `is_demo = true`, e **todas as últimas tentativas de assinatura foram registradas com ambiente `sandbox`** — ou seja, o backend está de fato usando as credenciais de teste (`MP_ACCESS_TOKEN_TEST`). O que confunde é o comportamento do Mercado Pago: para assinaturas (preapproval), o MP **não devolve mais um link "sandbox"** separado; o link retornado é sempre `mercadopago.com.br`. A página parece produção, mas a cobrança pertence ao vendedor de teste — e só pode ser paga fazendo login com um **usuário comprador de teste**, nunca com a conta real.

### O que fazer
1. Confirmar objetivamente qual credencial está em uso: no checkout, consultar a conta do Mercado Pago dona do token e registrar no log se é conta de teste ou real, devolvendo essa informação junto com a resposta. Assim paramos de depender de suposição.
2. Se o log mostrar conta real, o segredo `MP_ACCESS_TOKEN_TEST` está preenchido com uma credencial de produção — nesse caso, substituir o segredo pelas credenciais de teste corretas.
3. Se confirmar que é conta de teste (cenário mais provável), ajustar a experiência para deixar isso claro em vez de parecer produção:
   - Aviso destacado na tela de pagamento em modo demo: "Ambiente de teste — pague com um usuário comprador de teste do Mercado Pago; sua conta real não funcionará aqui."
   - Registrar/exibir na mesma tela a orientação de usar o cartão de teste e o comprador de teste.
4. Manter a regra atual: demo → sandbox por redirecionamento; produção → whitelabel (checkout transparente). Sem mudança nessa lógica.

## Detalhes técnicos
- Rota: adicionar `<Route path="/vagas" ...>` em `src/App.tsx` envolvida apenas por `FlagGate flag="vagas"` (a chave já está `enabled = true`), fora de `RequireAccountType`/`Casal`.
- Validar leitura anônima de `staff_jobs` (política `staff_jobs_public_select`) com uma consulta sem sessão; ajustar `GRANT SELECT ... TO anon` se necessário.
- `supabase/functions/mp-checkout/index.ts`: chamar `GET /users/me` com o token do ambiente, logar `id`/`site_id`/tipo de conta e incluir um campo de diagnóstico na resposta (sem expor o token).
- `src/pages/Pagamento.tsx`: reforçar o bloco de aviso quando `ambiente === "sandbox"`, com instruções de comprador de teste.
