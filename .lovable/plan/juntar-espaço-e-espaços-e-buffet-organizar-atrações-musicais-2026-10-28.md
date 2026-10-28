# Juntar "Espaço" e "Espaços e Buffet" + organizar atrações musicais

## 1. Categoria duplicada
Hoje existem "Espaço" (7 fornecedores), "Buffet" (2) e "Espaços e Buffet" (desativada, 0 fornecedores).
- Manter "Espaço" e "Buffet" separados, como já estão em uso.
- Remover de vez "Espaços e Buffet": antes, mover para "Espaço" qualquer coisa que ainda aponte para ela (orçamentos, fornecedores do casal, perguntas da categoria, destaques, avisos).
- Links antigos `/categoria/espacos-buffet` passam a abrir "Espaço".

## 2. Música: além de bandas
Em vez de criar várias categorias pequenas (o que deixa a vitrine vazia), uma categoria só com tipos de atração:
- Renomear "Música e DJ" para **"Música e Atrações"** (endereço novo, com o antigo ainda funcionando).
- Nova pergunta obrigatória no cadastro: **"Que tipo de atração você oferece?"** (pode marcar várias):
  Banda, DJ, Voz e violão, Cantor(a) para cerimônia, Quarteto/trio de cordas, Saxofonista ou instrumentista solo, Coral, Bateria/escola de samba, Mariachi/grupo temático, Outra atração.
- Na página da categoria e na busca, filtro rápido por tipo (ex.: "Só DJs", "Música para cerimônia").
- O perfil do fornecedor mostra os tipos marcados como selos.
- "Som e Iluminação" continua separada (é equipamento, não atração).
- Os 6 fornecedores atuais recebem um aviso no painel para marcar seus tipos; até lá aparecem sem filtro.

## Detalhes técnicos
- Migration: reatribuir FKs de `875d4734…` para a categoria Espaço, apagar a categoria e seus `campos_categoria`; atualizar nome/slug de `musica-dj` → `musica-atracoes`; inserir campo multi-seleção `tipo_atracao` em `campos_categoria`.
- Mapa de slugs antigos em `categoriaSlug.ts` (`espacos-buffet`→`espaco`, `musica-dj`→`musica-atracoes`).
- Filtro por chip em `CategoriaPublica`/`Explore` lendo `fornecedor_campos`.
