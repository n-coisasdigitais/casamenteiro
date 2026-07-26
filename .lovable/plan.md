
# Corretagem de datas ociosas — entrega sem Mercado Pago

Sim, dá para entregar tudo agora **sem** a integração Mercado Pago. O split MP entra numa segunda etapa; nesta primeira construímos schema, regras, UI e o "esqueleto" do checkout com um stub que registra a intenção de pagamento mas não movimenta dinheiro. Tudo fica atrás da flag `corretagem_datas_ociosas` (grupo Aquisição, essencial=false, enabled=false) — com a flag off, nada aparece nem roda.

---

## 1. Feature flag

- Registrar `corretagem_datas_ociosas` em `feature_flags` (seed) e em `FEATURE_FLAG_DEFAULTS` do `FeatureFlagsContext.tsx`.
- Toda UI nova envolvida em `useFeatureFlag("corretagem_datas_ociosas")`; rotas admin novas com `<FlagGate>`.

## 2. Migration (schema completo, pronto para MP no futuro)

**`supplier_promo_dates`** — novas colunas:
- `piso_fornecedor numeric` (mínimo que o fornecedor aceita)
- `markup_pct numeric` (percentual sugerido no cadastro; motor de preço pode sobrescrever)
- `valor_ofertado numeric` (calculado; snapshot para exibição ao casal)

**`idle_date_reservations`** — novas colunas:
- `piso_fornecedor numeric` (snapshot no momento da oferta)
- `markup_pct numeric`
- `valor_ofertado numeric`
- `comissao_plataforma numeric`
- `mp_split_payment_id text` (fica NULL até a integração MP)
- `modo_cobranca text check in ('taxa_reserva','corretagem') default 'taxa_reserva'` — separa o fluxo P2.4 do novo
- `contrato_id uuid` fk → `reservation_contracts.id`

**`suppliers.mp_account_id text`** (nullable — preenchido só quando MP entrar).

**Nova tabela `commission_ledger`** (idempotente por reserva):
- `reservation_id uuid unique fk`, `piso numeric`, `valor_ofertado numeric`, `comissao numeric`
- `mp_payment_id text` (NULL enquanto MP não integrar)
- `status text check in ('pendente','pago','estornado','cancelado') default 'pendente'`
- created/updated_at + trigger de updated_at
- GRANTs authenticated/service_role; RLS: fornecedor vê os próprios, admin tudo.

**Nova tabela `reservation_contracts`**:
- `reservation_id uuid unique fk`, `couple_id`, `supplier_id`
- `piso numeric`, `valor_ofertado numeric`, `comissao numeric`
- `corpo_html text` (contrato renderizado — placeholder para assinatura futura)
- `assinado_casal_em timestamptz`, `assinado_fornecedor_em timestamptz` (nullable — não usamos ainda)
- `status text check in ('rascunho','emitido','assinado','cancelado') default 'rascunho'`
- GRANTs + RLS: partes veem o próprio contrato; admin tudo.

**Função `calc_oferta_corretagem(_piso numeric, _markup_pct numeric)`**: devolve `valor_ofertado` e `comissao` (motor de preço; começa simples: `valor = piso * (1 + markup/100)`, `comissao = valor - piso`; encapsulado para depois puxar overrides de `platform_prices`).

**Preço em `platform_prices`**: nova linha-chave `corretagem_data_ociosa` (modo `percentual`, percentual default 15, override por categoria permitido) — reaproveita infra existente.

## 3. Motor de preço

`src/lib/corretagem.ts`:
- `calcularOferta({ piso, categoriaSlug })` → chama RPC/`calc_platform_fee('corretagem_data_ociosa', ...)` sobre o piso e devolve `{ valorOfertado, comissao, markupPctEfetivo, memoria }`.
- Helpers de formatação e labels (nunca exibir `piso`/`comissao` para o casal).

## 4. UI fornecedor (atrás da flag)

- `PromoDatesManager.tsx`: adicionar campos `piso_fornecedor` e `markup_pct` (opcional; se vazio, usa default). Preview mostrando "Casal verá: R$ X" e "Você recebe: R$ piso" — só visível ao fornecedor.
- Aba "Reservas" (`SupplierReservationsTab.tsx`): quando a reserva for `modo_cobranca='corretagem'`, exibir card com piso, valor ofertado, comissão e status do split (por ora sempre "aguardando integração de pagamentos"). Nenhuma ação de cobrança ainda.
- Perfil do fornecedor no painel: novo campo `mp_account_id` marcado como "Necessário para receber via corretagem (em breve)". Salvar mas exibir aviso de que o recebimento só é liberado após integração MP.

## 5. UI casal (atrás da flag)

- `RequestReservationDialog.tsx` e `PromoDatesInline.tsx`: quando a promo tiver `piso_fornecedor` definido e a flag on, mostrar CTA "Reservar por R$ valor_ofertado" (nunca expor piso/markup). Ao clicar:
  1. Cria reserva com `modo_cobranca='corretagem'`, snapshot de piso/markup/valor/comissao, status `solicitada`.
  2. Gera `reservation_contracts` em `rascunho` com corpo padrão pt-BR (cláusula de intermediação, sem responsabilidade pela execução).
  3. Abre tela "Pagamento (em breve)" com resumo, contrato para leitura e botão desabilitado "Pagar com Mercado Pago — disponível em breve". Enquanto MP não entra, admin pode marcar manualmente como paga em `/admin/reservas` para testes.
- Copy: "solicitação de reserva"/"aguardando pagamento"; "confirmada" só após pagamento.

## 6. UI admin

- `/admin/tabela-precos`: nova aba "Corretagem" (ou linha na aba Reservas) editando `corretagem_data_ociosa`.
- `/admin/reservas`: filtro por `modo_cobranca`; coluna piso/valor/comissão; ação "Marcar pago manualmente" (só admin, só enquanto MP não integrar — gera linha no `commission_ledger` como `pago`, dispara mesmo caminho de confirmação: bloqueia data + notifica casal).
- Nova página `/admin/corretagem-ledger` listando `commission_ledger` com totais por status.

## 7. Contrato (placeholder)

`src/lib/contratos.ts` com template pt-BR:
- Partes (casal, fornecedor), data do evento, valor ofertado, cláusula de intermediação, política de cancelamento resumida, foro.
- Renderiza `corpo_html` gravado em `reservation_contracts`. Tela do casal e do fornecedor conseguem visualizar/baixar (impressão via `window.print`).
- Assinatura eletrônica fica para depois — campos já existem.

## 8. Stub Mercado Pago

- Nenhuma edge function MP nesta entrega. Comentário `// TODO(MP)` nos pontos exatos (`iniciarCheckoutSplit`, `webhookMP`).
- Botão do casal fica desabilitado com tooltip "Pagamentos serão liberados em breve".
- Campo `mp_split_payment_id` sempre NULL; `commission_ledger.mp_payment_id` NULL até integrar.
- Admin usa "Marcar pago manualmente" para simular em ambiente controlado.

## 9. Segurança / RLS

- `commission_ledger` e `reservation_contracts` com policies escopadas por `auth.uid()` via `get_couple_id_for_user` e `suppliers.user_id`. Admin usa `has_role`.
- Impedir alteração de `piso_fornecedor`/`valor_ofertado`/`comissao` na reserva depois de criada (trigger `BEFORE UPDATE`).

## 10. Ordem de execução

1. Migration completa (schema + função `calc_oferta_corretagem` + seed `corretagem_data_ociosa` + flag).
2. `src/lib/corretagem.ts` + `src/lib/contratos.ts`.
3. UI fornecedor (promo dates + aba reservas + campo `mp_account_id`).
4. UI casal (dialog de reserva por corretagem + tela pagamento stub + visualização contrato).
5. UI admin (tabela de preços aba corretagem, filtro em reservas, `/admin/corretagem-ledger`, ação "marcar pago manualmente").
6. Envolver tudo em `FlagGate`/`useFeatureFlag`; flag entregue **off**.

## Fora de escopo (fica para a etapa MP)

- Edge functions `mp-checkout-split` e `mp-webhook`.
- Preenchimento real de `mp_split_payment_id` e transição automática de `commission_ledger` → `pago`.
- Assinatura eletrônica do contrato.
- Repasse/estorno automatizado.
