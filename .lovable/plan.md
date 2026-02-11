

# Pagina de Perfil do Usuario + Menu do Usuario

## O que sera feito

Criar uma pagina de perfil/configuracoes para o usuario do tipo "casal", alem de um menu dropdown no header (ao clicar no avatar) presente em todas as paginas logadas. Inspirado nos prints do casamentos.com.br.

## Funcionalidades

### 1. Pagina de Perfil (`/perfil`)
- Secao de perfil com avatar (iniciais do nome), nome completo, email e data do casamento
- Edicao dos dados pessoais: nome completo, nome do parceiro(a), papel (noivo/noiva)
- Edicao dos dados do casamento: data, numero de convidados, orcamento estimado
- Secao de configuracoes: alterar senha
- Botao de fechar sessao

### 2. Menu Dropdown do Usuario (Header)
- Substituir o botao simples de "LogOut" nos headers do CoupleDashboard, Favorites e outras paginas logadas
- Avatar com iniciais do nome (circulo com cor primaria)
- Ao clicar, abre dropdown com:
  - Nome do usuario + link "Perfil"
  - Link "Meu Casamento" (dashboard)
  - Link "Fornecedores" (buscar)
  - Link "Favoritos"
  - Separador
  - "Configuracao" (vai para /perfil)
  - "Fechar sessao"

### 3. Componente UserMenu reutilizavel
- Componente `UserMenu` que encapsula o avatar + dropdown
- Reutilizado em todos os headers das paginas logadas

## Detalhes Tecnicos

### Novo arquivo: `src/components/UserMenu.tsx`
- Usa DropdownMenu do Radix (ja instalado)
- Recebe `profile` e `signOut` do AuthContext
- Avatar com iniciais geradas a partir do `full_name`
- Links para /perfil, /dashboard, /buscar, /favoritos
- Botao de fechar sessao

### Novo arquivo: `src/pages/UserProfile.tsx`
- Rota: `/perfil`
- Carrega dados de `profiles` e `couples` do banco
- Formulario editavel para nome, parceiro, data, convidados, orcamento
- Usa `supabase.from("profiles").update(...)` e `supabase.from("couples").update(...)`
- Secao para trocar senha via `supabase.auth.updateUser({ password })`
- Layout consistente com DM Sans (sem font-serif)

### Alteracoes em arquivos existentes

**`src/App.tsx`**
- Adicionar rota `/perfil` apontando para UserProfile

**`src/pages/CoupleDashboard.tsx`**
- Substituir o header atual (botao LogOut) pelo componente `UserMenu`

**`src/pages/Favorites.tsx`**
- Adicionar `UserMenu` no header

**`src/pages/Index.tsx`**
- Quando usuario estiver logado, mostrar `UserMenu` ao inves dos botoes "Entrar/Cadastrar"

### Banco de dados
- Nenhuma alteracao necessaria. Os campos `profiles.full_name` e `couples.*` ja cobrem os dados editaveis. Avatar sera gerado por iniciais (sem necessidade de upload por enquanto).

