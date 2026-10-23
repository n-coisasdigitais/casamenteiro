# Nova página "Sou fornecedor" (pacote enviado)

## Decisões já tomadas
- **Dias de teste:** fica só o campo que já existe em Configurações ("Período de teste"). A página nova lê esse mesmo valor; o pacote não cria um segundo.
- **Configurações:** junto as duas versões — fica o e-mail de suporte (ola@ncoisas.digital) e o período de teste atual, e entram as novidades do pacote ("Mostrar como Em breve" em cada funcionalidade desligada + prazo de aprovação em horas).
- **Seção "Comece grátis em 3 passos":** sai da página.

## O que muda para você
1. Página /fornecedor nova, em capítulos: topo com pedidos chegando, pedido certo, como funciona, painel, planos, depoimentos, dúvidas e cadastro final com e-mail.
2. Funcionalidades desligadas aparecem com o selo "Em breve" na Home e no /fornecedor (dá para esconder uma a uma no admin).
3. No admin da Landing Fornecedor, abas novas: Pedido certo, Painel, Planos (textos) e Dúvidas.
4. Digitar o e-mail no fim da página abre o cadastro já na aba "Sou Fornecedor" com o e-mail preenchido.

## Passos
1. Banco: rodar a parte do pacote que adiciona o "Em breve" às funcionalidades e o prazo de aprovação (24h). **Não** criar a configuração duplicada de dias de teste nem mexer no gatilho de aprovação (já usa o campo atual).
2. Copiar os 6 arquivos novos e substituir: página do fornecedor, textos padrão, admin da landing, funcionalidades, Home (seção de celebração), cadastro e onboarding.
3. Configurações: mesclar à mão em vez de substituir.
4. Ajustar a leitura dos dias de teste da página para o campo atual.
5. Conferir que os filtros de demo/real e a flag da agenda continuam nos arquivos substituídos.
6. Testar no navegador: planos, taxa R$ 100 e carência, "Em breve", e-mail pré-preenchido no cadastro, celular sem rolagem lateral.

## Detalhes técnicos
- Migração: só `feature_flags.em_breve` e `system_settings.fornecedor_aprovacao_horas`; omitir `fornecedor_teste_dias` e a função `fornecedor_teste_dias()`.
- `src/lib/fornecedorLanding.ts`: trocar a chave lida para `trial_dias` (`value->>'dias'`, padrão 60).
- `AdminSettings.tsx`: aplicar o diff do pacote sobre o arquivo atual, preservando `suporte_email` e `trial_dias`; remover o campo de dias duplicado do bloco "Fornecedores novos".
- Backup dos arquivos substituídos em /tmp.
