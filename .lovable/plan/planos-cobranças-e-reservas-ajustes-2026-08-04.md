# Planos, cobranças e reservas: ajustes

## 1. Menu somem nas páginas de Faturas e Planos

`/fornecedor/faturas` e `/fornecedor/planos` são páginas soltas, sem a barra lateral do painel. Vou envolvê-las no mesmo shell de navegação usado no painel do fornecedor (sidebar no desktop + barra de abas no mobile), com destaque do item ativo, para que o fornecedor nunca fique "preso" sem menu.

## 2. Nova página de admin: Planos e cobranças (`/admin/planos`)

Uma central onde o admin controla tudo que é cobrado:

- **Planos de assinatura**: criar, editar, reordenar, ativar/desativar. Campos: nome, descrição, preço mensal, preço anual, benefícios (lista), destaque na busca, ordem.
- **Funcionalidades por plano**: para cada plano, uma lista de chaves de funcionalidade do sistema (CRM de leads, reservas de datas ociosas, vagas/equipe, anexos públicos, agenda/calendário, destaque, avaliações etc.) com liga/desliga, mais limites numéricos (ex.: nº de fotos, nº de leads por mês, nº de anexos).
- **Pacotes de destaque**: hoje os pacotes (7/15/30 dias e valores) estão fixos no código. Passam a ser cadastrados pelo admin — criar, editar preço/dias, ativar/desativar.
- **Atalho para a tabela de preços** já existente (taxas de reserva, corretagem, desconto de indicação), para o admin ter tudo num lugar só.

O painel do fornecedor (`/fornecedor/planos`) passa a ler os pacotes de destaque do banco em vez da lista fixa, e a exibir as funcionalidades de cada plano vindas da configuração do admin.

## 3. Liberação de funcionalidades conforme o plano

- Um utilitário `usePlanFeature(chave)` lê o plano ativo do fornecedor e responde se a funcionalidade está liberada.
- A regra final é: funcionalidade visível somente se a *feature flag global* estiver ligada **e** o plano do fornecedor a incluir.
- Onde o plano não inclui, o item aparece bloqueado com um convite para fazer upgrade (em vez de simplesmente sumir), levando para `/fornecedor/planos`.
- Fornecedor sem assinatura ativa cai no plano gratuito/essencial configurado pelo admin.

## 4. Reserva de data ociosa não apareceu para o fornecedor

Verificado no banco: a solicitação existe (status "solicitada", data 18/08/2026) e as permissões de leitura do fornecedor estão corretas — ou seja, ela está na aba **Negócio › Reservas** do painel, mas sem nenhum sinal visual que leve o fornecedor até lá, e sem etapa de pagamento na confirmação. Ajustes:

- Contador de pendências no menu (badge "Reservas 1") e um card de alerta no topo do painel do fornecedor quando houver solicitação aguardando resposta.
- Notificação no sino ao chegar uma nova solicitação (com link direto para a aba).
- **Aceitar e pagar**: ao confirmar a reserva, além de calcular a taxa, o fornecedor é levado ao checkout (`/pagamento?tipo=reserva&ref=...`). A data só é bloqueada e o casal só recebe a confirmação após o pagamento aprovado; enquanto isso a reserva fica como "aguardando pagamento".
- A mesma reserva passa a aparecer também em Faturas e pagamentos.

## Detalhes técnicos

- Migração: coluna `recursos jsonb` em `subscription_plans` (mapa chave→booleano/limite) e nova tabela `featured_packages` (dias, valor, label, ativo, ordem) com GRANTs, RLS de leitura pública e escrita só para admin.
- Novo `src/pages/AdminPlanos.tsx` + rota em `App.tsx` e item no `AdminLayout`.
- Novo `src/components/supplier/SupplierShell.tsx` extraído do `SupplierDashboard` para reuso em Faturas/Planos.
- `src/lib/monetizacao.ts`: `listarPacotesDestaque()` substituindo `PACOTES_DESTAQUE`; catálogo de chaves de funcionalidade em `src/lib/planFeatures.ts`.
- `SupplierReservationsTab`: confirmação passa a criar o `payment_intent` da taxa e redirecionar ao checkout; status intermediário `aguardando_pagamento`.
