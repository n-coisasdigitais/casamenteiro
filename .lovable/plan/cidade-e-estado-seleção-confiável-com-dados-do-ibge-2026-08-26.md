# Cidade e estado: seleção confiável com dados do IBGE

## Problema

No cadastro do profissional o campo **Estado (UF)** é somente leitura e só é preenchido quando o usuário clica em uma sugestão do autocomplete. Se ele digitar a cidade sem selecionar (ou a lista do IBGE demorar/falhar e cair no fallback do banco, onde a UF pode vir vazia), o formulário fica só com o nome da cidade e sem estado — e não há como corrigir manualmente.

Além disso, outros formulários que pedem cidade (nova vaga do fornecedor, área de atendimento) não capturam a UF, então a mesma cidade pode existir em estados diferentes sem distinção.

## O que será feito

1. **Seletor de Estado (UF) real**
   - Novo componente compartilhado "Cidade e estado": um select com as 27 UFs (lista oficial IBGE) + o autocomplete de cidade ao lado.
   - Ao escolher a UF, a busca de cidades passa a filtrar apenas municípios daquele estado.
   - Ao escolher a cidade, a UF é preenchida automaticamente (e fica visível/ajustável).

2. **Cadastro do profissional (`/profissional/cadastro`)**
   - Passa a usar o novo componente: o estado aparece preenchido e selecionável.
   - Validação: só salva com cidade da lista oficial + UF definida (mensagem em pt-BR).

3. **Nova vaga do fornecedor**
   - Ganha o campo Estado (UF) junto da cidade, salvo no registro da vaga (usa a coluna de estado já existente ou, se não existir, guarda "Cidade - UF" no campo atual — a decisão fica documentada na parte técnica).

4. **Autocomplete de cidades mais robusto**
   - Extração da UF cobrindo os dois formatos da API do IBGE (microrregião e região imediata) — hoje um município novo já vem sem UF pelo caminho atual.
   - Cache do resultado no navegador (sessão) para não baixar a lista completa em cada busca, importante no mobile.
   - Fallback do banco também retorna UF; sugestões sempre exibem "Cidade — UF".

5. **Área de atendimento do fornecedor**
   - Chips de cidades passam a exibir a UF, evitando cidades homônimas.

## Detalhes técnicos

- `src/components/CityAutocomplete.tsx`: adicionar prop `uf?: string` para filtrar sugestões, corrigir extração de sigla (`microrregiao.mesorregiao.UF.sigla` → fallback `regiao-imediata.regiao-intermediaria.UF.sigla`), persistir cache em `sessionStorage`, e garantir `estado` no fallback de `cidades_coordenadas`.
- Novo `src/components/CityStateSelect.tsx`: Select de UF (shadcn) + `CityAutocomplete` com `fonte="brasil"`, expondo `{ cidade, estado }`.
- Consumidores atualizados: `src/pages/StaffOnboarding.tsx`, `src/components/staff/PublishJobDialog.tsx`, `src/components/supplier/SupplierAreaEditor.tsx`.
- Verificar em `staff_jobs` se existe coluna de estado; se não existir, incluir migração simples adicionando `estado text` (com GRANT/RLS já vigentes na tabela) em vez de concatenar no campo cidade.
- Sem mudanças de regra de negócio ou preços; tudo em pt-BR.
