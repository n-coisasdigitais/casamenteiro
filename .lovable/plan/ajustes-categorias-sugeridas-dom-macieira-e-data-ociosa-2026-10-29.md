# Ajustes: Categorias sugeridas, Dom Macieira e Data ociosa

## 1. Dom Macieira "pagante" com R$ 0 — diagnóstico (já confirmado)
Não foi erro de pagamento. Os dados mostram:
- Plano **Essencial** (gratuito, R$ 0/mês), status "ativa", criado em 15/10.
- Ambiente **sandbox** (teste), sem cobrança no Mercado Pago e sem nenhuma fatura.

Ou seja: ele está no plano gratuito, e a tela de Assinaturas do admin conta toda assinatura "ativa" como se fosse pagante.

**Ajuste:** na tela de Transações > Assinaturas do admin:
- Planos de R$ 0 aparecem com selo **"Gratuito"**, não entram em "pagantes" nem na receita.
- Assinaturas feitas em teste aparecem com selo **"Teste"** e ficam fora dos totais de receita.
- Contadores separados: Pagantes, Gratuitos, Em teste de 60 dias.

## 2. Categorias sugeridas — mais respiro
- Mais espaço entre os cartões e dentro de cada um.
- Cabeçalho do cartão com nome, contagem e botões alinhados, sem apertar no celular.
- Cada sugestão em linha mais alta, com fornecedor, data e status bem separados.
- Seguir o mesmo visual das outras telas do admin.

## 3. Explicar "Data ociosa" para o fornecedor
Hoje só existe uma frase curta no card "Datas ociosas com desconto". Vou adicionar um quadro explicativo no topo desse card (painel do fornecedor, aba de reservas/agenda):
- **O que é:** um dia em que sua agenda está livre e você aceita fazer um valor menor para não ficar parado.
- **Como funciona:** você marca a data e o desconto; ela aparece em destaque para os casais no simulador e na busca; o casal pede a reserva e você confirma.
- **Exemplo:** "Sexta, 14/03, livre — 20% de desconto."
- Pode ser fechado ("Entendi") e reaberto por um ícone de ajuda.
- Se a taxa da reserva estiver ligada, mostra o valor da taxa no texto.

## Detalhes técnicos
- `src/pages/AdminTransacoes.tsx`: classificar por `valor = 0`/`preco_mensal = 0` e `ambiente = 'sandbox'`; ajustar métricas.
- `src/pages/AdminCategoriasSugeridas.tsx`: espaçamentos (gap, padding) e classes `cz-*` do admin.
- `src/components/PromoDatesManager.tsx`: bloco explicativo recolhível (estado salvo localmente).
- Sem mudanças no banco.
