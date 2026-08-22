# Cupons, indicações e gestão de assinatura do fornecedor

## O que já existe (verificado)

| Item | Situação |
|---|---|
| 2 meses grátis | Existe: o gatilho `set_trial_on_approval` grava `trial_ends_at = aprovação + 60 dias`. |
| Bloqueio "estilo Tinder" ao fim do trial | Existe: `usePlanFeature` libera tudo em trial e, depois, só o que o plano assinado inclui; `PlanGate` borra o conteúdo e mostra "Assinar e desbloquear". |
| Planos, ciclos, preços, recursos por plano | Existem (`subscription_plans` + `/admin/planos`). |
| Cancelamento com acesso até o fim do ciclo | Existe: `mp-cancel-subscription` cancela no Mercado Pago, marca `cancelada` e **mantém** `current_period_end`; o acesso continua até essa data. Nada é apagado. |
| Troca de plano com ajuste de valor no MP | Existe (`mp-change-plan`, faz `PUT /preapproval`). |
| Cupons | **Não existe** — `AdminCupons.tsx` e `CupomInput.tsx` estão vazios. |
| Indicação entre fornecedores | **Não existe** — a tabela `referrals` é só de casais (`couple_id`); não há status por etapa nem desconto. |
| Job de descontos agendados | **Não existe** — `aplicar-descontos-agendados/index.ts` está vazio. |

Ou seja: a base de assinatura/trial/bloqueio está pronta; falta a camada comercial (cupons, indicações, descontos, presentes).

## Como tratar desconto/mês grátis no Mercado Pago

Assinatura recorrente no MP é um `preapproval` com um valor fixo — não existe "cupom" nativo. Duas alavancas reais, ambas já testadas na API que usamos:

1. **Desconto temporário**: `PUT /preapproval/{id}` alterando `auto_recurring.transaction_amount` (é exatamente o que o `mp-change-plan` já faz). Aplicamos o valor com desconto e agendamos a volta ao valor cheio.
2. **Mês grátis**: `PUT /preapproval/{id}` com `status: "paused"` e depois `"authorized"` na data de retorno. Pausar não cobra e não cancela.

Quem executa o retorno é a função `aplicar-descontos-agendados`, rodando 1x por dia por cron: ela varre os benefícios vencendo, restaura valor cheio e reativa preapprovals pausados. Todo benefício fica registrado com data de início e fim, então mesmo se um dia falhar, o job seguinte corrige.

**Recomendação sobre "a partir do 2º mês"**: concordo com você. Como o fornecedor já tem 60 dias grátis, dar desconto no 1º pagamento premia quem sairia mesmo. Proposta: o benefício é aplicado **no primeiro ciclo cobrado após o fim do trial** — na prática já é o "segundo momento" da relação, e evita a saída imediata. Se preferir mais rígido, dá para exigir 1 fatura paga antes de liberar o benefício; deixo isso como uma opção configurável no admin (`aplicar_a_partir_do_ciclo`: 1 ou 2).

## O que vou construir

### 1. Cupons (admin)
Nova página `/admin/cupons`: criar cupom com código, tipo (percentual, valor fixo ou meses grátis), duração do benefício (nº de ciclos), janela de validade (cadastro entre X e Y), limite de usos total e por fornecedor, planos elegíveis e ativo/inativo.

No fornecedor, campo "Tenho um cupom" em `/fornecedor/planos`: valida o código na hora, mostra o preço com desconto e o que acontece depois ("R$ X nos 3 primeiros meses, depois R$ Y").

### 2. Presentes e descontos manuais (admin)
Na ficha do fornecedor, o admin pode conceder: meses grátis, desconto percentual por N ciclos ou crédito. Fica registrado quem concedeu e por quê (entra no log de auditoria já existente).

### 3. Indicação entre fornecedores
- Cada fornecedor ganha um link/código próprio.
- Página `/fornecedor/indicacoes`: lista de indicados com status **Convidado → Cadastro incompleto → Cadastro completo → Assinou**, e o benefício correspondente a cada etapa.
- Regras padrão (editáveis pelo admin): 10% quando o indicado completa o cadastro e é aprovado; 50% quando o indicado assina um plano pago. Benefício aplicado no próximo ciclo do indicador, acumulável até um teto configurável (sugiro teto de 100% em um único ciclo, para não gerar valor negativo).
- O benefício de "assinou" só é concedido depois da 1ª fatura paga do indicado, evitando assinatura-fantasma.

### 4. Cancelamento
Já funciona como na App Store. Vou apenas deixar isso explícito na tela: substituir o `confirm()` do navegador por um diálogo em português mostrando a data exata até quando o acesso continua, e um aviso na área do fornecedor enquanto a assinatura estiver cancelada mas vigente ("acesso até 12 de setembro"). Nenhum dado é apagado.

## Detalhes técnicos

- **Migração**: `coupons` (código, tipo, valor, ciclos, janela, limites, planos elegíveis), `coupon_redemptions`, `supplier_credits` (benefícios pendentes/aplicados/expirados com `valor_original`, `valor_com_desconto`, `ciclos_restantes`, `origem`: cupom | indicação | presente admin), `supplier_referrals` + `supplier_referral_events` (ou extensão de `referrals` com `supplier_id`). Todas com GRANTs, RLS (fornecedor lê o que é dele; escrita de concessão só via função com `SECURITY DEFINER`/admin) e `updated_at`.
- **Edge functions**: `aplicar-descontos-agendados` (cron diário: aplica benefício no preapproval, pausa/reativa mês grátis, restaura valor cheio, encerra benefícios); `mp-checkout` passa a considerar o benefício vigente ao criar a assinatura; `mp-webhook` marca a indicação como convertida quando a 1ª fatura do indicado é aprovada.
- **Frontend**: `AdminCupons.tsx`, `CupomInput.tsx`, `FornecedorIndicacoes.tsx` (arquivos já existem vazios), ajustes em `FornecedorPlanos.tsx` e `MinhaAssinaturaCard.tsx`, item no `AdminLayout` e no `SupplierSidebar`.
- **Flags novas**: `cupons`, `indicacao_fornecedor` — entregues desligáveis pelo admin.
- Tudo em pt-BR.

## Ordem de entrega
1. Base de benefícios (`supplier_credits`) + job diário + cancelamento explícito.
2. Cupons (admin + fornecedor).
3. Indicação entre fornecedores com status e conversão via webhook.
4. Presentes/descontos manuais no admin.

## Decisões confirmadas
- Benefício (cupom ou indicação) vale a partir do **1º ciclo cobrado** após o fim dos 60 dias de teste.
- Acúmulo de indicações limitado a **100% em um único ciclo** (vira um mês grátis); o excedente fica guardado para os ciclos seguintes.
- Links de indicação usam sempre o **domínio próprio** (`https://www.casamenteiro.com.br/i/CODIGO`) via `publicBaseUrl()` — nunca o domínio de preview.

