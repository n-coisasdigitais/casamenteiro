# Sistema de Feature Flags administráveis

## 1. Migration Supabase

Nova migration com:

- Tabela `public.feature_flags` (key PK, enabled, label, grupo, essencial, description, updated_at, updated_by).
- `GRANT SELECT ON public.feature_flags TO anon, authenticated;`
- `GRANT ALL ON public.feature_flags TO authenticated, service_role;`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Policies:
  - `SELECT` público (`USING (true)`) para `anon` e `authenticated`.
  - `ALL` para admin usando `public.has_role(auth.uid(),'admin')`.
- Trigger `update_updated_at_column` no `BEFORE UPDATE`.
- Seed via `INSERT ... ON CONFLICT (key) DO NOTHING` com as 14 flags listadas, agrupadas em Aquisição, Casal, Fornecedor, Social.

## 2. Contexto de Feature Flags

**`src/contexts/FeatureFlagsContext.tsx`** (novo):
- `FeatureFlagsProvider` carrega `feature_flags` uma vez no mount (leitura pública, funciona deslogado).
- Mantém defaults hardcoded (mesmos do seed) para evitar flicker enquanto carrega.
- Expõe `useFeatureFlag(key)` e `useFeatureFlags()`.
- Provider inserido no `src/App.tsx` **acima** do `AuthProvider` (não depende de auth).

**`src/hooks/useFeatureFlag.ts`**: reescrito para reexportar do contexto (mantém compatibilidade com `PlatformFeatures.tsx`, remove a query solta por chamada).

## 3. FlagGate + rotas sociais

**`src/components/FlagGate.tsx`** (novo): lê flag; se off, `<Navigate to="/" replace />`; senão renderiza children.

Em `src/App.tsx`, envolver com `<FlagGate flag="...">` estas rotas:
- `/casais` → `casais_feed`
- `/casais/:slug` → `casais_feed`
- `/meu-casamento/perfil` → `perfil_social_casal`
- `/mensagens` → `mensagens_casais`
- `/meu-casamento/indicacoes` → `indicacoes`
- `/i/:codigo` → `indicacoes`
- `/admin/indicacoes` → `indicacoes`

## 4. Home + menus

- `src/components/shared/PlatformFeatures.tsx`: já filtra via `useFeatureFlag` para `perfil_social_casal` e `indicacoes` (só passa a usar o novo provider).
- Auditar `DashboardNav`, `UserMenu`, `HomeNavbar` e footer da Home/Supplier para esconder links de: `/casais`, `/mensagens`, `/meu-casamento/perfil`, `/meu-casamento/indicacoes` quando as flags correspondentes estiverem off.

## 5. Admin — `src/pages/AdminSettings.tsx`

Adicionar seção **Funcionalidades** acima da distribuição de orçamento:
- Carrega todas as flags de `feature_flags` ordenadas por `grupo, label`.
- Renderiza agrupado por `grupo` (Aquisição, Casal, Fornecedor, Social).
- Cada linha: label + badge "essencial" (quando aplicável) + description + Switch (shadcn).
- Toggle faz upsert (`enabled`, `updated_by=user.id`, `updated_at=now()`) e recarrega.
- Flags essenciais pedem confirmação via `AlertDialog` antes de desligar.
- Após save, invalida cache do provider (recarrega) para propagar mudança sem reload.

## Detalhes técnicos

- Nada de mudança de lógica de negócio; só visibilidade.
- Tipagem: `feature_flags` não estará em `types.ts` até a migration ser aprovada — usar `as any` nas queries iniciais igual ao padrão de `system_settings` no projeto.
- Tudo em pt-BR.
- Sem alteração de RLS de outras tabelas.

## Ordem de execução

1. Rodar migration (aprovação do usuário).
2. Criar provider, hook, FlagGate.
3. Atualizar `App.tsx` (provider + gates).
4. Ajustar menus/footer.
5. Ajustar `AdminSettings.tsx`.
