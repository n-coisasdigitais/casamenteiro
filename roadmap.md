# Roadmap

- [x] Adicionar filtros de cadastro incompleto na comunicação com canais plataforma/e-mail e aviso editável; seleção real conferida (9 fornecedores, 212 profissionais sem documentos ou com recusas), 6 testes passaram. Nenhuma mensagem real disparada.
- [x] Conferir a regra existente de documentos dos fornecedores: aprovação exige foto de perfil, 4 fotos do trabalho, contato, descrição de 80 caracteres, cidade/estado, categoria e respostas obrigatórias; não exige documentos internos. Filtro de dados já reutiliza essa regra; nenhuma nova exigência criada.

- [x] Conferir feedback compartilhado (botão, Ajuda dos painéis, Central de Ajuda, admin, envio e resposta) e categorias (lista, sugestões, campos e formulários). Corrigidos confirmação de registro, recuperação de erros, aviso de email parcial e margens móveis; 12 testes passaram. Resposta real por email e upload não exercitados.

- [x] Corrigir carregamento e envio de feedback: consulta e status conferidos no admin; envio confirmado em conta comum e admin; 9 testes passaram.
- [x] Ajustar margens de Categorias sugeridas: conferido no celular e computador, sem corte lateral.

- [x] Adicionar duplicação de categorias com seus campos e criar Convites e Sites Virtuais; os 18 arquivos continuam vazios e nenhum build foi executado manualmente. Teste unitário passou; conferência no admin indisponível com a sessão do solicitante.

- [x] Aplicar símbolo oficial com nome Casamenteiro e favicon em todas as frentes; páginas públicas e menus conferidos no computador e celular. Conferência autenticada indisponível: painel permaneceu em “Carregando...”.

- [x] Revisar avisos de segurança do banco (linter) e corrigir funções/views
- [x] Página "Seja fornecedor" mais forte (plano grátis, como funcionam orçamentos, cadastro rápido)
- [x] Aviso visível de dados de demonstração
- [x] Executar e validar alterações dos destaques da Home: 15 pacotes, 17 colunas, 5 funções, 2 gatilhos e políticas
- [ ] Criar armazenamento público `destaques` — bloqueado pela política do workspace; administrador precisa permitir buckets públicos em Settings → Privacy & Security
- [x] Conta com vários perfis (fornecedor + profissional): RPCs, trava do tipo de conta, seletor, convite dispensável, selos no admin. Testes de banco e unidade passaram. Falta conferir na tela com uma conta logada.
- [x] Envio 2: bug do tipo no cadastro corrigido; Central de Ajuda pública em /ajuda com admin, perguntas iniciais, SEO e sitemap. Testes unitários e conferência no navegador (só leitura) ok.
- [ ] Envio 3: aba Ajuda do painel, Dúvidas da landing do fornecedor lendo as perguntas, ícones "?" contextuais — aguardando envio.
