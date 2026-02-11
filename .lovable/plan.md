

# 🎊 Plataforma "Meu Grande Dia" — MVP Completo

## Visão Geral
Uma plataforma elegante de planejamento de casamentos que conecta casais a fornecedores de serviços. Design mobile-first com paleta suave (branco, bege, dourado, cinza). Backend via Lovable Cloud (Supabase).

---

## 1. Landing Page
- Headline atrativa com imagem hero de casamento
- Seção "Como funciona" em 3 passos
- Dois CTAs principais: "Sou Casal" e "Sou Fornecedor"
- Design elegante com tons de branco, bege e dourado claro
- Fonte elegante e legível (ex: Playfair Display + Inter)

## 2. Autenticação
- **Cadastro separado** para Casal e Fornecedor (com seleção de tipo de conta)
- Login com e-mail e senha via Supabase Auth
- Verificação de e-mail obrigatória para ambos
- Após login, redireciona para o fluxo correto (onboarding ou dashboard)

## 3. Sistema de Contas Vinculadas (Casal)
- Ao cadastrar, o casal cria uma conta principal
- Pode gerar um **código de convite** para o parceiro(a)
- O parceiro se cadastra normalmente e insere o código para vincular
- Ambos acessam o mesmo dashboard e dados do casamento

## 4. Onboarding do Casal
- Formulário em etapas (wizard) após primeiro login:
  - "Eu sou..." (noivo/noiva)
  - Nome do parceiro(a)
  - Data prevista do casamento
  - Número estimado de convidados
  - Orçamento total estimado
  - Quais serviços está precisando (seleção múltipla de categorias)
- Dados salvos no banco e usados para personalizar a busca

## 5. Dashboard do Casal
- Resumo do casamento (data, countdown, orçamento)
- Sugestões de fornecedores baseadas nas categorias selecionadas no onboarding
- Acesso rápido à busca de fornecedores
- Lista de fornecedores favoritados

## 6. Busca de Fornecedores
- Filtros por **categoria** (Espaços, Fotografia, Buffet, Música, etc.) e **localização** (Cidade/Estado)
- Pré-preenchido com dados do onboarding do casal
- Grid de resultados com foto principal, nome, categoria e cidade
- Layout responsivo (cards em grid)

## 7. Perfil Público do Fornecedor
- Nome da empresa e categoria
- Galeria de fotos (portfólio)
- Descrição detalhada dos serviços
- Informações de contato (telefone, e-mail)
- Botão de "Favoritar" para o casal
- Sem avaliações/comentários neste MVP

## 8. Área Privada do Fornecedor
- Formulário para preencher/editar perfil:
  - Nome da empresa, descrição, categoria, localização, contato
  - Upload de até 10 fotos (Supabase Storage)
- Status visível: "Pendente de Aprovação" / "Aprovado" / "Rejeitado"
- Mensagem clara sobre o processo de aprovação

## 9. Painel de Administração
- Página protegida (acesso apenas para admin via roles no banco)
- Lista de fornecedores pendentes de aprovação
- Visualização do perfil completo de cada fornecedor
- Botões "Aprovar" e "Rejeitar"
- Fornecedores rejeitados não aparecem na busca; aprovados ficam visíveis

## 10. Banco de Dados (Supabase)
- Tabelas: profiles, couples (dados do casamento), suppliers (fornecedores), supplier_photos, categories, couple_favorites, user_roles, couple_links (vinculação de contas)
- RLS policies para segurança
- Storage bucket para fotos dos fornecedores
- Role de admin para o painel administrativo

## Design & UX
- **Mobile-first** com layout responsivo
- Paleta: branco, bege (#F5F0EB), dourado claro (#D4AF37), cinza claro
- Tipografia elegante (Playfair Display para títulos, Inter para corpo)
- Componentes limpos e minimalistas
- Inspirado no estilo de casamentos.com.br

