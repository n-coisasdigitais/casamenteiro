# Correções: broadcast, preços, auditoria, carregamento e mobile

## 1. Histórico de mensagens em massa

Confirmado: a tabela de histórico está vazia (0 registros) porque a função de envio (`admin_broadcast_notification` e a versão segmentada) cria as notificações mas nunca grava a linha do histórico.

- Alterar as duas funções de envio para gravar no histórico: quem enviou, segmento, filtros usados, título, texto, link, canal e quantidade de destinatários.
- Registrar também o envio como evento de auditoria.
- Se o envio não atingir ninguém, ainda assim registrar (com 0 destinatários), para o admin ver a tentativa.

## 2. Unificar tabelas de preço (planos, destaques e taxas)

Hoje existem três telas: Planos, Preços da plataforma e pacotes de destaque — com valores duplicados (há dois conjuntos de pacotes de destaque cadastrados: 89/159/279 e 49,90/89,90/149,90).

- Criar uma única tela **Preços** no admin com abas: *Assinaturas*, *Destaques* e *Taxas da plataforma*. As rotas antigas passam a apontar para ela.
- Limpar os pacotes de destaque duplicados, mantendo um conjunto por escopo (categoria e home).
- Corrigir o plano Pro: **R$ 99,90/mês**; anual com o mesmo desconto proporcional já praticado (10 meses) → **R$ 999,00**. Ajustar Premium na mesma régua se você confirmar (hoje 197 / 1970).
- A home lê os planos direto do banco, então passa a mostrar 99,90 automaticamente; vou ajustar a formatação para exibir centavos e o preço anual com o selo de desconto (hoje só mostra o mensal, sem centavos).

## 3. Auditoria de verdade (todo insert/update/delete)

Confirmado: só existem 52 eventos, todos de pagamento e reserva — cadastro de usuário, broadcast e o resto não entram.

- Criar uma função genérica de auditoria e aplicá-la como gatilho em **todas as tabelas de negócio** do banco (inserção, alteração e exclusão), gravando: quem fez, papel, tabela, id do registro, ação, dados antes/depois (apenas os campos que mudaram, no caso de alteração) e horário.
- Excluir do registro automático campos sensíveis (tokens, segredos) e tabelas de altíssimo volume/ruído (log de e-mail, fila de e-mail, visualizações de perfil, o próprio log de eventos) para não inflar o banco — essas continuam com registro só nos pontos relevantes.
- Cobrir explicitamente os casos citados: **cadastro de usuário** (novo perfil, novo fornecedor, novo profissional, novo casal), **login/impersonação de admin**, **broadcast**, aprovações, mudanças de papel e exclusões.
- Ações feitas por funções internas e webhooks passam a identificar a origem (sistema, admin, usuário).
- Na tela de auditoria: filtro por tabela e por tipo de operação, além dos filtros atuais, e retenção configurável (padrão: manter 12 meses).

## 4. Texto sem estilo aparecendo antes do site carregar

Confirmado: é o conteúdo estático gerado no prerender (SEO) — ele fica visível até o React montar.

- Manter o bloco no HTML (crawlers e prévia de link continuam lendo), mas posicioná-lo fora da área visível, de modo que o visitante não veja o "HTML cru" em nenhum momento.
- Validar em produção com o build gerado, em rotas prerenderizadas (home, fornecedor, categorias, cidades).

## 5. Scroll em branco no painel do fornecedor (mobile)

- Reproduzir em viewport mobile na aba **Meu negócio → Perfil**, salvando os detalhes, e identificar o elemento que gera a altura extra (suspeita: blocos ocultos do menu lateral/abas mantendo altura, ou o espaçamento inferior somado à altura de conteúdo já desmontado).
- Corrigir a altura do container para terminar logo após o botão de salvar, mantendo o menu inferior fixo e o espaço apenas suficiente para não cobrir o botão.

## Detalhes técnicos

- Auditoria: `public.audit_row()` como `SECURITY DEFINER` gravando em `platform_events` (`entity` = tabela, `before`/`after` em jsonb com diff em UPDATE), aplicada via `DO $$` iterando `pg_class` no schema `public`, com lista de exclusão. Índices adicionais por `entity` e `user_id`.
- Broadcast: `INSERT INTO broadcast_history` dentro de `admin_broadcast_notification` e `admin_broadcast_segmented`, retornando o mesmo contador.
- Preços: nova página `AdminPrecos.tsx` com abas reaproveitando `AdminPlanos.tsx`, `AdminPlatformPrices.tsx` e o editor de pacotes; `subscription_plans` atualizado por comando de dados.
- Prerender: envolver o bloco injetado em `scripts/prerender.ts` num container fora da viewport (`position:absolute;left:-9999px`), mantendo `main.tsx` limpando o `#root` no mount.
