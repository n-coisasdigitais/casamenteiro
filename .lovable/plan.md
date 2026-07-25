
## Importação de convidados — CSV/XLSX com mapeamento e relatório

Reescrever `src/components/ImportGuestsDialog.tsx` como um wizard de 4 passos, mantendo o botão atual em `WeddingGuests.tsx` (nenhuma outra tela muda).

### Passo 1 — Upload
- Aceitar `.csv`, `.xlsx`, `.xls` (parser: `papaparse` para CSV, `xlsx` — SheetJS — para Excel; adicionar `xlsx` ao package.json).
- Manter a opção "colar lista" atual como alternativa.
- Texto de ajuda em destaque: *"Exporte sua lista do iCasei/Casar.com em CSV ou Excel e envie aqui. Aceitamos também planilhas do Google Sheets/Excel."*
- Ler primeira aba do XLSX; primeira linha = cabeçalho.

### Passo 2 — Mapeamento de colunas
Tabela com uma linha por coluna do arquivo:

| Coluna do arquivo | Exemplo (1ª linha) | Mapear para ▾ |

Campos-alvo do select:
- Nome *(obrigatório)*
- Telefone / WhatsApp
- E-mail
- Grupo / Família
- Tipo (adulto / criança / bebê)
- Confirmação (RSVP)
- Mesa
- Observação
- **Ignorar** (padrão para colunas não reconhecidas)

**Adivinhação automática** por nome de cabeçalho (case/acento-insensível), cobrindo variações do iCasei e Casar.com:
- `nome`, `convidado`, `name`, `nome completo` → Nome
- `telefone`, `celular`, `whatsapp`, `phone`, `fone` → Telefone
- `email`, `e-mail`, `endereço de e-mail` → E-mail
- `grupo`, `família`, `familia`, `lado`, `categoria de convidado` → Grupo
- `tipo`, `faixa etária`, `adulto/criança` → Tipo
- `confirmação`, `confirmado`, `rsvp`, `status`, `presença` → Confirmação
- `mesa`, `table` → Mesa
- `observação`, `obs`, `notas`, `comentário` → Observação

Erro bloqueante se **Nome** não estiver mapeado.

### Passo 3 — Preview + configurações
- Tabela das **10 primeiras linhas** após mapeamento aplicado, mostrando cada campo já convertido (tipo normalizado, telefone formatado com `formatPhoneBR`, confirmação em pt-BR).
- Contador: "X linhas no total, N com aviso" (aviso = telefone inválido, e-mail malformado, tipo não reconhecido → assume adulto).
- Select "Grupo padrão" (para linhas sem grupo mapeado) — reaproveita o existente.
- **Detecção de duplicados** com radio:
  - "Ignorar duplicados" (padrão)
  - "Atualizar dados do convidado existente"
  
  Duplicado = mesmo `couple_id` + (nome normalizado + telefone com dígitos iguais). Se telefone vazio, apenas nome normalizado.

### Passo 4 — Importação e relatório
Processamento em lotes de 50, com barra de progresso, e classificação linha a linha:
- **Importado** — inserido com sucesso
- **Atualizado** — duplicado encontrado + modo "atualizar"
- **Ignorado** — duplicado + modo "ignorar" (motivo: "Já existe: <nome>")
- **Erro** — sem nome, ou falha do banco (motivo do Postgres)

Tela final:
```
✔ 128 importados
↻ 12 atualizados
⊘ 8 ignorados (duplicados)
✕ 3 com erro   [Baixar linhas com erro (CSV)]
```
O CSV de erro contém as colunas originais + coluna extra `erro`.

### Detalhes técnicos

**Dependência nova**: `xlsx` (SheetJS) via `bun add xlsx`.

**Normalização**:
- Nome: `trim` + colapsar espaços; comparação de duplicado usa lowercase + sem acento.
- Telefone: `onlyDigits` de `src/lib/phone.ts`; grava formatado; duplicado compara só dígitos.
- Tipo: dicionário estendido — `adulto/adult/grown` → adult; `criança/crianca/kid/child/menor` → child; `bebê/bebe/baby/infante` → baby; default adult.
- Confirmação: `sim/confirmado/yes/y/1` → true; `não/nao/no/n/0/pendente` → false/null; grava em `wedding_guests.confirmed` (bool existente).

**Query de duplicados**: um único `select id, name, phone` do casal antes do loop, indexado em Map por chave `nomeNormalizado|telefoneDigitos`.

**Grupos**: mantém lógica atual de criar grupos ausentes; passa a rodar em batch antes das inserções.

**Estado do wizard**: `step: 'upload' | 'map' | 'preview' | 'result'` dentro do próprio Dialog, com botões Voltar/Avançar no rodapé.

**Colunas alvo já existentes** em `wedding_guests`: `name`, `email`, `phone`, `guest_type`, `group_id`, `confirmed`, `table_number`, `notes` — nenhuma migração necessária (confirmar com read_query os nomes exatos das duas últimas antes de codar; se não existirem, silenciosamente ignoradas com aviso no preview em vez de migrar sem pedir).

### Arquivos afetados
- `src/components/ImportGuestsDialog.tsx` — reescrita (wizard).
- `package.json` — adiciona `xlsx`.
- Nenhuma alteração em `WeddingGuests.tsx`, banco ou edge functions.

Tudo em pt-BR.
