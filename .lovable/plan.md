# Segurança e Auditoria da Plataforma

## O que eu verifiquei (confirmado no banco e no código)

| Item apontado | Situação real |
|---|---|
| 1. Telefone/WhatsApp do fornecedor públicos | **Confirmado e crítico.** A policy `Approved suppliers are public` na tabela `suppliers` libera a linha inteira (incluindo `phone`, `whatsapp`, `email`) para qualquer visitante anônimo. A tela `SupplierProfile` só esconde visualmente (`phoneUnlocked`) — o dado já veio no JSON. `fornecedor_campos` tem policy pública equivalente, e os campos base `telefone` e `whatsapp` existem em `campos_categoria` (hoje sem respostas preenchidas, mas o furo é estrutural). |
| 2. Depoimentos falsos no banco | **Já resolvido.** `fornecedor_landing_config.config->'testimonials'->'items'` está vazio e `rating_text` também. Sobrou apenas um título em inglês ("Wall of love") a corrigir. |
| 3. Chave anon / service_role | **Sem problema.** A anon key é publicável por design; a service_role só aparece em Edge Functions via `Deno.env`. Nenhuma ação. |
| 4. Caracteres invisíveis (U+200B) | **Não encontrados.** Varredura em `src/` e `supabase/` não achou nenhum zero-width space. Nenhuma ação. |
| 5. RLS de quotes / propostas / lead_notes | **Correta.** Casal vê só os próprios (via `get_couple_id_for_user`), fornecedor só os que recebeu, notas de lead só do dono. Sem vazamento entre contas. |
| Auditoria de eventos | **Parcial.** Existe `admin_audit_log` e a tela `/admin/auditoria`, mas só grava ações de admin (aprovação de fornecedor, impersonação, suspensão). Exclusões, convites, reservas e aceites não entram. |

## O que vou fazer

### 1. Fechar o contato do fornecedor (crítico)
- Restringir o acesso público à tabela `suppliers` por coluna: o público deixa de ler `phone`, `whatsapp` e `email`; o resto do perfil continua público.
- Ampliar a função segura `get_supplier_contact` para liberar contato apenas quando existir relação real dentro da plataforma: orçamento enviado, reserva confirmada, contratação no plano do casal, ou o próprio dono/admin.
- Na policy pública de `fornecedor_campos`, excluir campos de chave `telefone`/`whatsapp` e similares — respostas de contato só para dono e admin.
- No front (`SupplierProfile`), trocar o "desbloqueio" cosmético por chamada real à função: sem relação, o botão leva ao pedido de orçamento interno.

### 2. Registro central de eventos da plataforma (auditoria)
- Nova tabela `platform_events` (quem, papel, ação, entidade, id, dados antes/depois, origem, severidade, quando); somente admin lê, escrita apenas por triggers e funções internas.
- Triggers automáticos nas operações que importam:
  - exclusões em tabelas sensíveis (convidados, tarefas, fornecedores do plano, orçamentos, fotos, vagas);
  - convites: envio, reenvio e resposta de RSVP;
  - reservas de data ociosa: pedido, confirmação, cancelamento, expiração;
  - aceites: proposta aceita, contrato/assinatura, candidatura de profissional aceita;
  - pagamentos e webhooks (sucesso e falha);
  - alterações de papel e suspensão de usuário.
- Falhas também viram evento (erros de webhook e de e-mail) com severidade, para gestão de erros.
- Nova aba **Eventos** em `/admin/auditoria`, com filtros por severidade, ação, entidade, usuário e período, busca livre, detalhe expandível (antes/depois) e exportação CSV, no mesmo padrão da tela atual.

### 3. Limpeza da landing
- Trocar "Wall of love" pelos títulos em pt-BR na config salva no banco, mantendo a lista de depoimentos vazia.

## Detalhes técnicos

- Restrição por coluna via `REVOKE SELECT ON public.suppliers FROM anon, authenticated` + `GRANT SELECT (colunas não sensíveis)`; a RLS atual continua valendo. Exige revisar os `select("*")` em `suppliers` no front e trocar por listas explícitas de colunas.
- `get_supplier_contact(_supplier_id)` continua `SECURITY DEFINER`, com checagem de relação em `quotes`, `couple_suppliers`, `idle_date_reservations` e `staff_jobs`.
- `platform_events` com `GRANT SELECT` para `authenticated` (policy de admin) e `GRANT ALL` para `service_role`; função `log_platform_event(...)` `SECURITY DEFINER` usada por triggers e Edge Functions.
- Índices por `created_at`, `action` e `entity` para a tela de admin responder rápido.