## Perfil Social do Casal + Sistema de Indicações

Implementação em **3 fases** para reduzir risco e permitir validação incremental. A spec original usa nomes como `planos` e `plano_id`, mas o projeto atual usa `couples` e `couple_id` — adaptaremos mantendo a intenção. A tabela `reviews` (fornecedor) já existe e será estendida em vez de duplicada.

---

### Fase 1 — Perfis públicos de casais + avaliações mútuas

**Banco (migration)**
- `couple_public_profiles` (substitui `perfis_casais`): `couple_id` (FK couples), `slug` único, `nome_casal`, `bio`, `foto_capa_url`, `foto_perfil_url`, `estilo`, `publico`, e toggles `exibir_data/fornecedores/orcamento/fotos/videos/avaliacoes/casamento_mesmo_dia/mensagens_casais/mensagens_fornecedores`.
- `couple_photos` (`couple_id`, url, legenda, ordem, destaque, origem default `upload`, app_referencia).
- `couple_videos` (`couple_id`, tipo, url, titulo, thumbnail_url).
- `couple_profile_comments` (autor_id, texto, aprovado).
- Estender `reviews` existente: adicionar `autor_tipo` (couple|supplier), `alvo_tipo`, `alvo_id`, `aprovado`. Migrar reviews atuais como `autor_tipo='couple', alvo_tipo='supplier'`. View `supplier_reviews_public` mantém compatibilidade de leitura.
- Função trigger para gerar slug automático (`ana-e-pedro-2025`) ao criar perfil.
- RLS: leitura pública apenas quando `publico = true` e aprovado; escrita restrita ao dono do `couple_id` (via `get_couple_id_for_user`).
- Storage bucket `couple-profile` (público) para capas/álbum.

**Frontend**
- `/casais` — feed: grid responsivo, filtros (mês/ano, cidade, estilo), ordenação, scroll infinito (range 12).
- `/casais/:slug` — perfil público com SEO + JSON-LD (`Person`/`Event`), seções condicionais conforme toggles, lightbox de fotos, embed YouTube, sidebar de checklist de categorias contratadas.
- `/meu-casamento/perfil` — abas Informações / Fotos (upload + drag reorder) / Vídeos / Privacidade / Avaliações (avaliar fornecedores contratados + ver avaliações recebidas).
- No painel do fornecedor: nova aba "Avaliar casais" listando casais contratados com evento já realizado.
- Componentes reutilizáveis: `CoupleCard`, `RatingStars`, `ReviewModal`, `PrivacyToggleGroup`.

---

### Fase 2 — Comunidade: mesmo dia + comentários + mensagens

**Banco**
- View `casamentos_mesmo_dia` baseada em `couples.wedding_date` × `couple_public_profiles.publico`.
- `couple_messages` (de_user_id, para_user_id, texto, lida).
- Trigger de notificação ao receber mensagem/comentário (usa `notifications` existente).

**Frontend**
- Seção "Casando no mesmo dia" no perfil público + página `/comunidade/mesmo-dia` (requer login + data definida).
- Badges automáticos: "Mesma cidade!", "Mesmo fotógrafo!" (cruzar `couple_suppliers` contratados).
- Comentários no perfil público (requer login, fila de aprovação no admin).
- `/meu-casamento/mensagens` — inbox simples (coluna de conversas + chat), polling 30s.
- Bell de notificações já existente recebe os novos tipos.

---

### Fase 3 — Sistema de indicações

**Banco**
- `referrals` (gerado_por_tipo, gerado_por_id, codigo único, descricao, ativo, total_cliques, total_cadastros).
- `referral_conversions` (referral_id, user_id, tipo_usuario).
- Função `register_referral_click(codigo)` e `register_referral_signup(codigo, user_id)` (SECURITY DEFINER, sem auth necessária no clique).

**Frontend**
- `/meu-casamento/indicacoes` — gerar links (`/i/:codigo`), tabela com cliques/cadastros/taxa, botões copiar/compartilhar (navigator.share), gráfico simples (Recharts).
- Rota `/i/:codigo` — registra clique, grava `localStorage.indicacao_origem`, redireciona para `/`.
- Hook no `AuthContext`: ao criar conta (couple ou supplier), se houver `indicacao_origem` no localStorage, chama `register_referral_signup` e limpa.
- `/admin/indicacoes` — métricas no topo, tabela filtrável, expansão por linha com conversões, geração de links de campanha pelo admin.
- `/admin/comunidade` — moderação de comentários e perfis reportados (toggle público/oculto, aprovar/reprovar comentários e avaliações).

---

### Detalhes técnicos

```text
Rotas a adicionar em src/App.tsx
─────────────────────────────────
/casais                       → CasaisFeed
/casais/:slug                 → CasalPerfilPublico
/meu-casamento/perfil         → MeuCasamentoPerfil
/meu-casamento/mensagens      → MeuCasamentoMensagens   (fase 2)
/meu-casamento/indicacoes     → MeuCasamentoIndicacoes  (fase 3)
/comunidade/mesmo-dia         → ComunidadeMesmoDia      (fase 2)
/i/:codigo                    → IndicacaoRedirect       (fase 3)
/admin/indicacoes             → AdminIndicacoes         (fase 3)
/admin/comunidade             → AdminComunidade         (fase 2)
```

- **Validações**: zod em todos os forms; bio ≤ 500 chars; review texto ≥ 30 chars; foto ≤ 2MB; máx 50 fotos / 5 vídeos.
- **SEO**: `/casais/:slug` injeta meta tags + canonical + sitemap (incluir slugs públicos no `generate-sitemap.ts`).
- **i18n**: todo o conteúdo em pt-BR conforme regras do projeto.
- **Realtime**: fase 1 e 2 usam fetch/polling; opcional habilitar Supabase Realtime para mensagens depois.
- **Idempotência review**: unique (`couple_id`, `autor_id`, `alvo_id`) impede dupla avaliação.

---

### Confirmações antes de começar

1. Confirma começar pela **Fase 1** apenas (perfis + avaliações mútuas) e abrir as fases 2/3 em follow-ups separados? Implementar tudo de uma vez é viável mas resulta em ~25 arquivos novos.
2. Posso **estender a tabela `reviews` existente** (em vez de criar `avaliacoes` nova) para evitar duplicação e manter compatibilidade com `update_supplier_rating`?
3. O slug do perfil deve usar o nome do casal (`ana-e-pedro-2025`) — quando não houver `partner_name` definido, posso cair em `casal-<6chars>`?
