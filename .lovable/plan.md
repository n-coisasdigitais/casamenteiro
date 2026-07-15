# CTA "Pedir orçamento" nos cards do simulador

Alterar apenas o CTA primário de cada card de fornecedor em `src/pages/SimuladorResultado.tsx`, no modo NÃO-preview. Modo preview e visual dos cards permanecem inalterados.

## Mudanças

### 1. Estado e helpers (no componente `SimuladorResultado`)
- Novo estado `pedidosEnviados: Set<string>` — supplier_ids para os quais já existe pedido nesta sessão/plano.
- Novo estado `enviandoPedido: string | null` — supplier_id em envio (loading no botão).
- Ao carregar (fora do preview, com `user`): buscar `couples.id` do usuário e depois `quotes` já existentes deste casal para os supplier_ids da simulação, populando `pedidosEnviados`. Assim, se o casal já pediu antes, o WhatsApp aparece direto e o botão vira "Pedido enviado".

### 2. Função `pedirOrcamento(f)` 
- Se não há `user` → `navigate("/cadastro?redirect=simulador")`.
- Busca `couples.id` (`user_id = user.id`, `.maybeSingle()`).
- Insert em `quotes`:
  ```
  { couple_id, supplier_id: f.id,
    kanban_status: 'enviado',
    message: `Vim pelo simulador. Orçamento para ${resultado.resumo.convidados} convidados em ${resultado.resumo.cidade}.`,
    guest_count: resultado.resumo.convidados,
    event_date: sim.data_evento ?? null }
  ```
- On success: adicionar `f.id` a `pedidosEnviados`, `toast({ title: "Pedido enviado!", description: "Acompanhe em Orçamentos", action: <ToastAction onClick={()=>navigate('/orcamento')}>Abrir</ToastAction> })`.
- On error: toast destructive. Trigger `notify_supplier_on_quote` já dispara a notificação, sem código extra.

### 3. CTA do card (linhas 528–556)
Estrutura no modo NÃO-preview (o ramo `preview ?` fica igual):

```
{jaEnviado ? (
  <button disabled ...secondary style, "Pedido enviado ✓" />
) : (
  <button onClick={(e)=>{ e.stopPropagation(); pedirOrcamento(f); }}
          disabled={enviandoPedido === f.id}
          className="...rounded-full py-2 text-xs font-semibold..."
          style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}>
    {enviandoPedido === f.id ? <Loader2 spin/> : "Pedir orçamento"}
  </button>
)}

{jaEnviado && f.linkWhatsApp && (
  <a href={f.linkWhatsApp} target="_blank" rel="noreferrer"
     onClick={(e)=>e.stopPropagation()}
     className="mt-2 block text-center text-[11px] underline"
     style={{ color: "hsl(var(--color-text-muted))" }}>
    <MessageCircle className="w-3 h-3 inline mr-1" /> Falar pelo WhatsApp
  </a>
)}
```

Remove o ramo `f.linkWhatsApp ? <a> : <Link>Ver perfil</Link>` como CTA primário. O link para o perfil do fornecedor continua acessível pelo nome do card (linhas 502–504), então nenhuma navegação é perdida.

## Não muda
- Modo preview (`preview === true`): mantém o botão desabilitado "Pedir orçamento (criar conta)".
- Visual dos cards, borda de seleção, blur/lock do preview, toggle "datas ociosas", modal "Assumir este plano".
- Trigger `notify_supplier_on_quote` no banco já cobre a notificação — nenhuma migração necessária.
- Todo texto em pt-BR.
