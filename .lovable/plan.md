# Separação completa entre ambiente real e demonstração

## Objetivo
Garantir que o painel administrativo e as demais áreas nunca misturem cadastros reais com dados fictícios. O ambiente real será sempre o padrão; os dados demo só aparecerão após ativação explícita do modo demonstração.

## Correções

1. **Corrigir a classificação atual no banco**
   - Manter somente **Anderson Goulart** como fornecedor real.
   - Marcar **N COISAS FOTOGRAFIA** novamente como demonstração.
   - Preservar os demais 38 fornecedores já marcados como demo.

2. **Tornar o escopo de ambiente estrito**
   - Ajustar o utilitário central de escopo para retornar exclusivamente `is_demo = false` no ambiente real e exclusivamente `is_demo = true` no ambiente demo.
   - Evitar o comportamento atual em que a sessão demo aceita simultaneamente registros reais e fictícios.
   - Manter o ambiente real como padrão seguro quando não houver escolha explícita na sessão.

3. **Adicionar seleção explícita de ambiente para o administrador**
   - Exibir no cabeçalho/admin uma indicação clara de **Dados reais** ou **Dados demo**.
   - Permitir ao administrador alternar o conjunto de dados sem perder o acesso administrativo.
   - Ao sair do modo demo, limpar o estado da sessão e recarregar as consultas no ambiente real.

4. **Aplicar o filtro em todo o painel administrativo**
   - Filtrar fornecedores nas telas de painel, aprovação, CRM e edição em massa.
   - Filtrar casais e usuários nas telas de CRM e gestão de usuários.
   - Filtrar métricas e contagens para que dados demo não contaminem indicadores reais.
   - Nas consultas de dados relacionados que não possuem `is_demo` próprio — orçamentos, leads, avaliações, reservas e transações — restringir pelos IDs dos fornecedores/casais pertencentes ao ambiente ativo.
   - Garantir que buscas, exportações CSV, totais, badges e detalhes respeitem o mesmo escopo.

5. **Validar os dois ambientes**
   - No modo real, confirmar que o admin mostra Anderson Goulart e não mostra Studio Flor de Liz, Atelier Completo, N COISAS FOTOGRAFIA ou demais registros fictícios.
   - No modo demo, confirmar que apenas os registros fictícios aparecem e Anderson não é misturado.
   - Validar troca de ambiente, atualização da página, navegação entre telas administrativas e retorno ao modo real.

## Detalhes técnicos
- O banco já possui `is_demo` em `profiles`, `couples` e `suppliers`; essas entidades serão a origem do escopo.
- O código já possui `demoScope.ts`, mas atualmente o modo demo retorna `[true, false]`, e várias páginas admin não usam o helper.
- Não será necessário criar uma nova tabela; a correção envolve classificação de um registro, escopo central e aplicação consistente nas consultas existentes.
