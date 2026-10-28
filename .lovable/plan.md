# Melhorias: categorias, "Outros", logo, tipo de conta e link público

## O que a análise encontrou
- **Conta do Anderson está certa no banco**: o cadastro dele está salvo como fornecedor, com o negócio já aprovado e sem área de casal criada. O problema está na tela:
  1. A página "Meu perfil" (/perfil) mostra o campo "Eu sou: Noivo / Noiva" para **todo mundo**, inclusive fornecedores.
  2. A proteção da área do casal trata "perfil ainda carregando" como se fosse casal. Por um instante, o fornecedor passa por ela e pode ver o painel do casal.
  3. Na proteção, a opção "admin" nunca é reconhecida, porque o administrador é identificado de outro jeito.
- **Link público**: os perfis abrem por /fornecedor/ seguido de um código longo. O item "Perfil público" do menu do fornecedor leva para a **área interna de edição**, não para a página pública.
- **Categorias**: não existem Som/Iluminação, Brigadistas nem Outros. Hoje existem ao mesmo tempo "Espaço" e "Espaços e Buffet", o que parece duplicado. Essa duplicação fica só sinalizada; não vou mexer nela.
- **Logo**: não existe campo para isso. A "foto de perfil" atual continua como está.

## O que será feito

1. **Novas categorias**
   - Som e Iluminação, separada em subcategorias: Som e sonorização, Iluminação (cênica e de pista), Painéis e estruturas de LED, Palco e estrutura para eventos, Outros serviços audiovisuais. O fornecedor marca uma ou mais.
   - Brigadistas, com campos opcionais: tipo de cobertura, quantidade de profissionais, certificações e cobrança por evento ou por período. A região de atendimento reaproveita as cidades atendidas que já existem.
2. **Categoria "Outros"**
   - No cadastro e na edição, quem escolhe Outros precisa descrever o serviço (campo obrigatório).
   - O perfil é publicado normalmente em "Outros", depois da aprovação do cadastro.
   - Cada descrição vira uma sugestão salva com o fornecedor, a data e o status (pendente, aprovada ou recusada).
3. **Admin › Categorias sugeridas**
   - Lista com o nome sugerido, o fornecedor, a data e o status.
   - Agrupa sugestões parecidas (mesmo nome sem acento e sem diferença de maiúsculas) e mostra quantas vezes cada uma apareceu.
   - Botões Aprovar e Recusar. Aprovar não cria uma categoria pública sozinho: você cria a categoria depois, de propósito.
4. **Logo do fornecedor (campo novo)**
   - Envio no cadastro e em "Meu negócio", com prévia antes de salvar e opção de trocar.
   - Aceita PNG, JPG, WEBP ou SVG, até 2 MB. A imagem aparece inteira, sem distorção, e as iniciais aparecem quando não houver logo.
   - Aparece no perfil público, no painel do fornecedor, nos cards da busca e na aprovação e no cadastro do admin.
   - Sem selo de verificação.
5. **Tipo de conta**
   - A proteção espera o perfil carregar antes de decidir. Fornecedor e profissional vão sempre para o painel deles, e o admin é reconhecido corretamente.
   - O campo Noivo/Noiva e as abas do casal em /perfil aparecem só para casais.
   - No banco, a área do casal só aceita contas do tipo casal. Assim a regra vale mesmo fora da tela.
6. **Endereço público pelo nome**
   - Cada fornecedor ganha um endereço próprio, como /fornecedor/anderson-goulart. Nomes repetidos recebem um número no final.
   - Os links antigos com código continuam abrindo o perfil.
   - Todos os links do site passam a usar o novo endereço.
   - "Perfil público" no menu do fornecedor passa a abrir a página pública. "Editar perfil" continua indo para o painel.
   - Um endereço inválido mostra a página "Fornecedor não encontrado".

## Validação
Vou testar no navegador os 9 cenários do documento:
- cadastro com Som e Iluminação e com Outros;
- sugestão aparecendo no admin e mudança de status;
- envio e troca da logo;
- fornecedor sem acesso à área do casal;
- casal funcionando normalmente;
- perfil público do Anderson abrindo pelo novo endereço;
- endereço inválido mostrando o erro.

O que eu não conseguir testar com login de verdade vai ser informado.

## Detalhes técnicos
- Migration:
  - colunas `logo_url`, `slug` (única, gerada a partir de `company_name` e preenchida para os cadastros existentes), `subcategorias text[]`, `categoria_outros_descricao` em `suppliers`;
  - tabela `categoria_sugestoes` (supplier_id, nome, nome_normalizado, status, created_at, decidido_em) com GRANTs e RLS: o fornecedor insere e lê as próprias sugestões, o admin lê e atualiza todas;
  - trigger que cria a sugestão quando "Outros" é salvo;
  - trigger em `couples` que bloqueia contas que não sejam do tipo casal;
  - os dados das categorias (insert em categories/campos_categoria) vão pela ferramenta de dados.
- Storage: pasta `logos/{user_id}/` no bucket público já existente, com policies por dono.
- Front:
  - `RequireAccountType` aguarda o `profile` e usa `isAdmin`;
  - `UserProfile` mostra Noivo/Noiva só para casais;
  - `UserMenu` corrige o link "Perfil público";
  - a rota `/fornecedor/:id` resolve UUID ou slug;
  - um helper `linkFornecedor()` passa a ser usado nos cerca de 20 pontos de link;
  - componente `LogoFornecedor` usado no perfil público, no painel, nos cards da busca e no admin;
  - nova página `AdminCategoriasSugeridas` no menu do admin.
