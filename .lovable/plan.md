# Conversa única de orçamento (estilo WhatsApp)

Unificar `QuoteThread` + `QuoteProposalPanel` num único componente com timeline mesclada, composer único e estado derivado. Trocar a UI em `CoupleDashboard` e `SupplierDashboard`. `WeddingPlan` fica fora do escopo (uso antigo permanece) — não é uma das duas telas citadas.

Observação: o AI Elements gate não se aplica — este chat é humano↔humano (casal↔fornecedor), não um agente de IA.

## Novo componente: `src/components/QuoteConversation.tsx`

Props: `{ quoteId, currentUserId, isSupplier, coupleId, supplierId, onContracted? }`.

### Carregamento
- Fetch paralelo de `quote_messages` e `quote_proposals` por `quote_id`. Cada linha vira `Item = { kind: "text" | "value", id, senderId, createdAt, ...payload }`. Ordena por `createdAt`.
- Recarrega após enviar mensagem, enviar valor ou aceitar.

### Pill de estado (topo, derivado no cliente)
Ordem de prioridade sobre os itens:
1. `proposals.some(status === "accepted")` → **Fechado · R$ X** (usa a última aceita).
2. `proposals.some(status === "pending")` → **Proposta na mesa · R$ X** (última pendente).
3. Existe pelo menos uma mensagem/proposta minha E do outro lado → **Em conversa**.
4. Caso contrário → **Aguardando resposta**.

Não altera `quotes.status` nem `quotes.kanban_status` — os triggers existentes (`sync_quote_kanban_on_proposal`, `notify_on_proposal`, `notify_supplier_on_quote_accepted`) continuam responsáveis. O select manual do SupplierDashboard é removido.

### Timeline
Layout WhatsApp: bolhas alinhadas à direita para minhas mensagens (`bg-primary text-primary-foreground`), à esquerda para o outro lado (`bg-muted text-foreground`). Tipografia base `text-sm md:text-base`, padding generoso (`px-4 py-3`), timestamp `text-xs opacity-70`.

- **Item text**: bolha padrão renderizando `message` (whitespace-pre-line) + `<AttachmentList>` reutilizando o componente existente.
- **Item value**: bolha destacada com borda `border-2 border-primary` (ou anel âmbar para o outro lado se pendente), tipografia grande para o valor:
  - Linha 1: `R$ 12.500` (`text-2xl font-semibold tabular-nums`)
  - Linha 2: descrição opcional (só se enviada por baixo do valor no futuro — hoje sem input de descrição).
  - Badge fino de status: `Pendente` / `Aceita` / `Recusada`.
  - Se `sender_id !== currentUserId && status === "pending"`: botão `Aceitar este valor` (`size="lg"`, largura total da bolha, ícone `CheckCircle2`) que chama `aceitarValor(proposal)`.

### Composer único (rodapé, sticky)
Layout:
```
[textarea multilinha, autosize, min 44px]
[chip anexos] [chip "R$ 0,00" quando valor ativo]           [Anexar valor] [Enviar]
```

- Botão **Anexar valor (R$)**: toggle. Quando ativo, abre um input numérico compacto acima do composer (label "Valor da proposta (R$)"). Se digitado e o usuário clicar "Enviar":
  - `kind` inferido:
    - Casal → `discount_request`
    - Fornecedor + nenhuma `proposal` dele ainda → `proposal`
    - Fornecedor + já existe `proposal` dele → `counter`
  - Insert em `quote_proposals { quote_id, sender_id: currentUserId, kind, amount, description: message.trim() || null, status: "pending" }`.
  - Se `newMessage.trim()` tiver texto sem valor, ainda insere em `quote_messages` separado? Não: se valor está ativo, o texto vira `description` da proposta (uma "mensagem com valor"). Se valor não está ativo, insere só em `quote_messages`.
- Botão **Enviar** (sem valor): mesma lógica atual do `QuoteThread` (upload de anexos + insert em `quote_messages`).
- Palavras "contraproposta"/"pedido de desconto" nunca aparecem — o `kind` continua sendo salvo no banco (triggers dependem dele), mas a UI só mostra "R$ X" com badge de status.

Placeholder do textarea: `"Escreva uma mensagem..."`. Mantém templates do `QuoteThread` em `<details>` colapsado no rodapé para fornecedor.

### `aceitarValor(p)` — fluxo único
1. `UPDATE quote_proposals SET status='accepted' WHERE id=p.id` — dispara `sync_quote_kanban_on_proposal` + `notify_supplier_on_quote_accepted` automaticamente.
2. Reaproveita a lógica de `marcarContratado` do `QuoteProposalPanel` (copiada para dentro do novo componente):
   - Busca `suppliers` + `categories` do supplier.
   - Upsert `couple_suppliers` com `status='contracted'`, `final_value=amount`, `contract_value=amount`, `contracted_at=now`, `category_id`.
   - Upsert `budget_items` com `estimated_cost=amount`, `final_cost=amount`, `status='contracted'`, `category=slug`, `description=company_name`.
   - `UPDATE quotes SET status='accepted', kanban_status='fechado' WHERE id=quoteId`.
3. `toast({ title: "Fechado!", description: "Atualizamos fornecedores e orçamento." })`.
4. `ConfirmFinishTaskDialog` (já existente) com a categoria — mantém o comportamento atual de sugerir concluir tarefa.
5. `onContracted?.()` → recarrega listas nas páginas pai.

Bloqueia botão se `!coupleId || !supplierId`.

## Wrapper responsivo: full-height no mobile

Em `CoupleDashboard.tsx` e `SupplierDashboard.tsx`, o container do Dialog vira responsivo. Padrão adotado:

```tsx
{isMobile ? (
  <Sheet open={...} onOpenChange={...}>
    <SheetContent side="bottom" className="h-[100dvh] p-0 flex flex-col gap-0 rounded-none">
      <SheetHeader className="px-4 py-3 border-b"><SheetTitle>...</SheetTitle></SheetHeader>
      <QuoteConversation ... />
    </SheetContent>
  </Sheet>
) : (
  <Dialog ...>
    <DialogContent className="sm:max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
      <DialogHeader className="px-4 py-3 border-b"><DialogTitle>...</DialogTitle></DialogHeader>
      <QuoteConversation ... />
    </DialogContent>
  </Dialog>
)}
```

`useIsMobile()` já existe em `@/hooks/use-mobile`. `Sheet` já disponível em `@/components/ui/sheet`.

O `QuoteConversation` ocupa `flex-1 min-h-0` e organiza internamente `[Pill status] [Timeline scroll] [Composer]`.

## Mudanças nas páginas

### `src/pages/SupplierDashboard.tsx`
- Remover imports `QuoteThread`, `QuoteProposalPanel`, e o `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` **se não usados em outro lugar** (o arquivo usa Select para categorias na linha 380, então mantém o import; só remover a instância do select de status).
- Remover o bloco `<Select value={selectedQuote.status} ...>` (linhas 462-483).
- Remover a função `updateQuoteStatus` **exceto** a chamada `updateQuoteStatus(quote.id, "viewed")` em `openThread` — trocar essa chamada por um update direto inline (`await supabase.from("quotes").update({ status: "viewed" }).eq("id", quote.id)`) para preservar o comportamento de auto-marcar visto ao abrir. A função pode ser apagada.
- Trocar o par `<QuoteThread>` + `<QuoteProposalPanel>` por `<QuoteConversation quoteId=... currentUserId={user.id} isSupplier coupleId={selectedQuote.couple_id} supplierId={supplier.id} onContracted={() => { loadQuotes(); setThreadOpen(false); }} />`.
- Envolver com o wrapper responsivo Dialog/Sheet.

### `src/pages/CoupleDashboard.tsx`
- Remover imports `QuoteThread`, `QuoteProposalPanel`.
- Trocar o par por `<QuoteConversation quoteId=... currentUserId={user.id} isSupplier={false} coupleId={couple.id} supplierId={selectedQuote.supplier_id} onContracted={() => setThreadOpen(false)} />`.
- Envolver com wrapper responsivo Dialog/Sheet.

### `src/pages/WeddingPlan.tsx`
- **Não alterar** — fora do escopo. Continua usando `QuoteThread` + `QuoteProposalPanel`.

### `src/components/QuoteThread.tsx` e `QuoteProposalPanel.tsx`
- **Manter** os arquivos (ainda usados por `WeddingPlan.tsx`).

## Preservado
- Todos os triggers do banco (`notify_supplier_on_quote`, `notify_on_proposal`, `notify_supplier_on_quote_accepted`, `sync_quote_kanban_on_proposal`, `sync_couple_supplier_on_proposal`).
- Bucket `quote-attachments` e componentes `AttachmentPicker`/`AttachmentList`.
- Templates de resposta para fornecedor (dentro de `<details>` no composer).
- `ConfirmFinishTaskDialog` acionado após aceitar/contratar.
- Todos os textos em pt-BR.
