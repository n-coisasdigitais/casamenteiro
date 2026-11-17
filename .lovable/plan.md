# Envio 2 — Bug do cadastro + Central de Ajuda (/ajuda)

## Divergências encontradas (confirme antes)
1. **Taxa de reserva** não fica em `system_settings`; vem de `platform_prices` (chave `reserva_data_ociosa`), já lida pela landing do fornecedor. Vou usar essa fonte.
2. **Dias de teste**: a chave real é `system_settings.trial_dias` (não existe `fornecedor_teste_dias`). Vou usar `trial_dias`.
3. **Flag de equipe**: a chave real é `vagas`. Datas ociosas: `datas_ociosas`. RSVP: `rsvp_convidados`. Todas existem.
4. O substituidor de placeholders já existe (`src/lib/fornecedorLanding.ts`, cobre `{taxa_reserva} {carencia_dias} {teste_dias} {aprovacao_horas}`). Vou ampliá-lo com `{preco_pro} {preco_premium} {preco_pro_anual} {preco_premium_anual}`, sem mudar o comportamento atual da landing.
5. Textos do seed (grátis, quem paga taxa, carência, contato do profissional) serão conferidos contra o código na implementação; qualquer diferença será listada no retorno.

## A) Bug do cadastro (prioridade)
**Causa confirmada:** em `Auth.tsx`, o recurso "vagas" começa como desligado enquanto carrega; um efeito vê "profissional + recurso desligado" e troca para casal antes do valor real chegar.
- Corrigir: só aplicar o reset depois que o recurso terminar de carregar (e só se ele estiver realmente desligado).
- `?tipo=` passa a aceitar `supplier|fornecedor|profissional|couple|casal|generico`.
- `?redirect=simulador` só força casal quando não houver `?tipo=` explícito.
- Fornecedor: não sofre o reset (só profissional é afetado), mas será testado igual.

**Relatório pedido:** contas de casal criadas nos últimos 60 dias sem onboarding concluído: **1**. Não será alterada.

## B) Página pública /ajuda (de cima para baixo)
1. Hero "O que é o Casamenteiro" (título + texto editável no admin).
2. Busca ao digitar, ignorando acento/maiúscula.
3. Abas Casais · Fornecedores · Profissionais; abre por `?para=`, senão pelo perfil ativo, senão Casais.
4. Como funciona: 3–4 passos com ícones, textos editáveis.
5. Funcionalidades: cards curados no admin (até 8 por público), cada um ligado a uma flag; regra igual à Home (ligada normal / desligada + "Em breve" com selo / senão some).
6. Planos (só Fornecedores): de `subscription_plans` ativos por `ordem`, mensal, anual com % de economia calculada, benefícios, dias de teste e taxa de reserva; botão "Começar" leva ao cadastro de fornecedor (ou planos, se logado).
7. Perguntas frequentes em acordeão por categoria; perguntas com flag desligada somem; âncora `#slug` abre e rola até a pergunta.
8. "Não achou? Fale com a gente": FormFeedback se logado; WhatsApp/e-mail (`suporte_email`) se não.

Visual nos tons da Home, mobile sem rolagem lateral.

## Admin › Conteúdo › Central de Ajuda
- CRUD de perguntas, filtros por público/categoria, reordenar (subir/descer), ativar/desativar, pré-visualização com placeholders trocados.
- Editar hero e "Como funciona" por público.
- Curadoria dos cards de funcionalidade por público (título, texto, ícone, flag, "mostrar Em breve", ordem).

## Navegação e SEO
- Link "Ajuda" discreto no footer e no header.
- Title/description próprios; JSON-LD `FAQPage` com perguntas ativas visíveis; `/ajuda` em `scripts/prerender.ts` e `scripts/generate-sitemap.ts`.

## Fora deste envio
Aba Ajuda do painel, Dúvidas da landing lendo `faq_itens`, ícones "?" contextuais.

## Detalhes técnicos

**Arquivos**
- Editar: `src/pages/Auth.tsx`, `src/lib/fornecedorLanding.ts`, `src/App.tsx` (rotas `/ajuda` e `/admin/ajuda`), `AdminLayout` (menu Conteúdo), Footer e header do site, `scripts/prerender.ts`, `scripts/generate-sitemap.ts`, `public/sitemap.xml`.
- Criar: `src/pages/Ajuda.tsx`, `src/components/ajuda/ajuda.css`, `src/lib/ajuda.ts` (carregamento, normalização da busca, placeholders, % anual), `src/pages/admin/AdminAjuda.tsx`, `src/test/ajuda.test.ts` (normalização, % de economia, placeholders, flag oculta pergunta, `?para=`), `src/test/authTipo.test.ts` (resolução de `?tipo=`).

**SQL previsto (uma migration)**
```sql
CREATE TABLE public.faq_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publico text NOT NULL DEFAULT 'todos' CHECK (publico IN ('casal','fornecedor','profissional','todos')),
  categoria text NOT NULL,
  pergunta text NOT NULL,
  slug text NOT NULL UNIQUE,
  resposta text NOT NULL,
  feature_flag text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faq_itens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_itens TO authenticated;
GRANT ALL ON public.faq_itens TO service_role;
ALTER TABLE public.faq_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq público lê ativos" ON public.faq_itens FOR SELECT TO anon, authenticated
  USING (ativo OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "faq admin escreve" ON public.faq_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER faq_itens_updated BEFORE UPDATE ON public.faq_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); -- usa o helper existente, se presente
-- auditoria: mesmo gatilho audit_row usado nas demais tabelas admin
```
Hero, "Como funciona" e cards de funcionalidade ficam como uma chave `ajuda_conteudo` (JSON) em `system_settings`, seguindo o padrão de `quiz_textos` — sem tabela nova. Seed das perguntas e do conteúdo inicial via inserção de dados (não migration).

**Testes a rodar**
Bug: `?tipo=profissional|supplier|couple` e clique manual mantêm a escolha (Playwright + teste unitário). /ajuda: alterar preço Pro reflete; plano inativo some; flag desligada some pergunta/card; busca; `?para=`; âncora; JSON-LD válido; 390px sem rolagem lateral. Alterações de preço/flag de teste serão revertidas ao fim.
