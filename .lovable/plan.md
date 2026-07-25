## Objetivo

Organizar os anexos dos fornecedores em uma seção única "Arquivos" no painel, com tipos distintos por categoria: **Planta baixa** exclusiva para locação de espaços, e **Anexos gerais** (com título/descrição livre) para todos os fornecedores. Galeria e documentos internos continuam suportados.

---

## 1. Banco de dados

Nova tabela `public.supplier_attachments`:

- `id` (uuid, pk)
- `supplier_id` (uuid, fk → suppliers)
- `tipo` (text, check: `galeria` | `planta_baixa` | `anexo` | `documento`)
- `titulo` (text) — obrigatório para `anexo`, opcional para os demais
- `descricao` (text, nullable) — texto de apoio/legenda
- `storage_path` (text) — caminho no bucket
- `file_name`, `mime_type`, `size_bytes`
- `drive_file_id`, `drive_synced_at` (nullable, para sync futuro)
- `ordem` (int, default 0) — ordenação manual
- `created_by` (uuid), `created_at`, `updated_at`

**GRANTs** para `authenticated` e `service_role`.

**RLS**:
- Dono (supplier.user_id = auth.uid()) gerencia todos os próprios registros.
- Admins gerenciam todos.
- SELECT público apenas para `tipo IN ('galeria','planta_baixa','anexo')` quando o supplier estiver `status='approved'` e o dono não for demo.
- `documento` fica sempre restrito ao dono/admin.

**Bucket Storage** `supplier-files` (privado). Estrutura: `{supplier_id}/{tipo}/{uuid-arquivo.ext}`.

Policies em `storage.objects`:
- Upload/update/delete: apenas dono do supplier ou admin, restrito ao bucket e ao prefixo do próprio `supplier_id`.
- SELECT via URL assinada (pública p/ galeria/planta_baixa/anexo, privada p/ documento).

---

## 2. Painel do fornecedor — nova aba "Arquivos"

Componente `SupplierFilesTab.tsx` dentro de `SupplierDashboard.tsx`, com subabas:

- **Galeria** — imagens do portfólio (já existente em `supplier_photos`, mantida como está; a nova tabela cuida do resto).
- **Planta baixa** *(apenas se `categoria = Espaços e Buffet / Local`)*
  - Upload drag-and-drop, até 10 MB, imagens (JPG/PNG/WEBP) ou PDF.
  - Campos: título opcional, legenda/descrição.
  - Texto de apoio fixo: *"A planta baixa ajuda bandas, buffets e cerimonialistas a planejar tomadas, palco, circulação e disposição de mesas."*
- **Anexos** *(todas as categorias)*
  - Upload drag-and-drop, até 10 MB, imagens + PDF.
  - Campos obrigatórios: **título** e **tipo/descrição** (ex.: "Cardápio 2026", "Portfólio de show", "Tabela de preços").
  - Lista com reordenação, edição inline, exclusão com confirmação.
- **Documentos internos** — arquivos privados (contratos-modelo etc.), não aparecem no perfil público.

Todos os uploads via signed URL do bucket, com validação client-side de tamanho/mime e barra de progresso.

---

## 3. Perfil público (`SupplierProfile.tsx`)

- **Planta baixa**: nova seção "Planta baixa do espaço" com visualizador (imagem com lightbox / preview de PDF via `<iframe>`) + botão download. Renderizada apenas quando houver arquivo E a categoria for de locação de espaço. Oculta caso contrário.
- **Anexos**: nova seção "Materiais e anexos" listando cada anexo com título, descrição e botão de download/visualização. Oculta se vazia.
- Documentos internos nunca aparecem.
- URLs de download geradas via signed URL (validade curta) no client.

---

## 4. Detecção da categoria "locação de espaços"

Baseada no slug da categoria (ex.: `espacos`, `local`, `recepcao`). Adicionar helper `isEspacoCategory(categorySlug)` em `src/lib/categories.ts` para reutilizar no painel e no perfil público.

---

## 5. i18n

Todos os textos, validações e toasts em pt-BR.

---

## Arquivos a criar/alterar

**Criar**
- Migração SQL (tabela + RLS + grants + policies do bucket)
- `src/components/supplier/SupplierFilesTab.tsx`
- `src/components/supplier/AttachmentUploader.tsx` (reutilizável)
- `src/components/supplier/FloorPlanViewer.tsx` (perfil público)
- `src/lib/categories.ts` (helper `isEspacoCategory`)

**Alterar**
- `src/pages/SupplierDashboard.tsx` — adicionar aba "Arquivos"
- `src/pages/SupplierProfile.tsx` — seções de planta baixa e anexos

---

## Fora do escopo

- Sincronização com Google Drive (campos `drive_*` ficam preparados, sem lógica).
- Migração do `supplier_photos` atual para a nova tabela (permanece funcionando em paralelo).