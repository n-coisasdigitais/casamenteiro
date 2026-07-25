## Contexto verificado

Em `src/pages/Simulador.tsx` a `finalizar()` **já não tem** o muro de cadastro descrito: não há toast "Crie sua conta", não há `navigate("/cadastro")` e não existe escrita de `pendingSimulacao` (camelCase). Restam três ajustes pontuais do pedido para deixar o fluxo consistente com a spec.

## Mudanças (arquivo único: `src/pages/Simulador.tsx`, função `finalizar`)

1. **Payload completo em `sessionStorage["preview_simulacao"]`**
   - Incluir as chaves faltantes `data_evento: null` e `prazo_meses: null` (o SimuladorResultado lê o objeto e espera esse shape).

2. **Registrar interesse mesmo sem `simulacaoId`**
   - Trocar `if (cidadeSemFornecedor && r.simulacaoId)` por `if (cidadeSemFornecedor)`.
   - Passar `simulacao_id: r.simulacaoId ?? null` no insert de `cidades_interesse` — não perde o sinal de demanda quando o insert em `home_simulacoes` falha silenciosamente.

3. **Toast de sucesso em pt-BR**
   - Após o cálculo (antes do `navigate`), disparar:
     `toast({ title: "Seu plano está pronto!", description: "Veja abaixo os detalhes." })`.

Sem outras mudanças: o `navigate("/simulador/resultado?preview=1")` como fallback já está no lugar, e não existem `pendingSimulacao` nem `/cadastro` para remover.

## Verificação pós-implementação

- Reler `finalizar()` para confirmar o shape do payload e a nova ordem toast → navigate.
- Testar mental/manualmente os 4 caminhos: (deslogado × logado) × (com id retornado × id null) — todos devem cair em `/simulador/resultado` com dados disponíveis.