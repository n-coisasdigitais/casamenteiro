## O que remover
- `DEFAULT_LANDING.testimonials.items` — os 4 depoimentos fabricados (Camila Rocha, Rafael Mendes, Juliana Lima, André Costa).
- `DEFAULT_LANDING.testimonials.rating_text` — "4.9 de avaliação média na plataforma".
- Título "Wall of love" e o subtítulo "Fornecedores reais, resultados reais.".
- Render do bloco de estrelas + `rating_text` em `TestimonialsSection.tsx` (para que nenhum número fabricado possa voltar via admin).
- Campo "Texto da avaliação" (`rating_text`) do editor em `AdminFornecedorLanding.tsx`.

## O que colocar no lugar (prova social honesta)

Nova seção `TrustSection` com 4 pilares — texto exato pedido:

1. **Cadastro gratuito** — "Crie seu perfil sem cartão de crédito e sem mensalidade obrigatória."
2. **Aprovação em 24h** — "Nossa equipe revisa e publica seu perfil em até um dia útil."
3. **Leads com orçamento e data definidos** — "Os pedidos chegam com valor esperado, cidade e data do casamento."
4. **Datas ociosas: encha sua agenda** — "Marque dias com pouca procura e receba pedidos de casais buscando data flexível."

Nada de números de avaliação, contagem de fornecedores ou métricas de volume nesta seção.

## Arquivos afetados

1. **`src/lib/supplierLandingConfig.ts`**
   - Adicionar `TrustPillar` e `TrustCfg` (eyebrow, title, subtitle, items com id/title/description/icon).
   - Adicionar `trust: TrustCfg` a `SupplierLandingConfig` (opcional para compat com registros antigos do banco).
   - Preencher `DEFAULT_LANDING.trust` com os 4 pilares acima.
   - Zerar `DEFAULT_LANDING.testimonials.items` (`[]`), esvaziar `rating_text` (`""`), trocar `title_pre`/`title_em` para copy neutro ("Depoimentos" / "reais") e subtitle para "Adicionamos aqui somente depoimentos verificados de fornecedores.".

2. **`src/components/supplier/landing/TrustSection.tsx`** (novo)
   - Layout: eyebrow + título centralizado + grid de 4 cards com ícone (lucide: `Gift`, `Clock`, `Target`, `CalendarCheck`), título e descrição.
   - Recebe `cfg?: TrustCfg` e usa `DEFAULT_LANDING.trust` como fallback.

3. **`src/components/supplier/landing/TestimonialsSection.tsx`**
   - Remover o bloco de estrelas + `{cfg.rating_text}`.
   - Já retorna `null` se `items.length === 0` — mantém.

4. **`src/pages/SupplierLanding.tsx`**
   - Adicionar `<TrustSection cfg={cfg.trust} />` no lugar onde hoje fica `<TestimonialsSection … />`.
   - Manter `TestimonialsSection` renderizado *depois* do Trust (ele mesmo retorna `null` quando `items` está vazio, então some por enquanto e volta a aparecer quando o admin cadastrar depoimentos reais).

5. **`src/pages/AdminFornecedorLanding.tsx`**
   - Remover o input "Texto da avaliação" (linha do `rating_text`).
   - Adicionar aviso no topo da aba Depoimentos: "Use apenas depoimentos reais, com autorização do fornecedor. Nunca inclua números de avaliação inventados.".
   - Adicionar aba "Prova social" para editar `cfg.trust` (título + 4 itens: título/descrição). Sem campo de números.

## Verificação
- Reler `SupplierLanding.tsx` após edição para conferir a ordem das seções.
- Grep final por `Camila Rocha|Rafael Mendes|Juliana Lima|André Costa|Wall of love|4\.9 de avaliação` → deve retornar zero ocorrências.
- Abrir `/fornecedor` mentalmente: seção depoimentos some (items=[]) e no lugar aparece Trust com os 4 pilares.

Sem migração de banco: registros antigos em `fornecedor_landing_config.config_json` continuam válidos; o render usa `cfg.trust ?? DEFAULT_LANDING.trust`.