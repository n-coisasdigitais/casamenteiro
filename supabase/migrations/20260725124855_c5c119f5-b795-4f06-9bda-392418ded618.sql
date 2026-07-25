
CREATE TABLE public.supplier_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('galeria','planta_baixa','anexo','documento')),
  titulo text,
  descricao text,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  drive_file_id text,
  drive_synced_at timestamptz,
  ordem int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_attachments_supplier ON public.supplier_attachments(supplier_id, tipo, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_attachments TO authenticated;
GRANT SELECT ON public.supplier_attachments TO anon;
GRANT ALL ON public.supplier_attachments TO service_role;

ALTER TABLE public.supplier_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own supplier attachments"
ON public.supplier_attachments
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage all supplier attachments"
ON public.supplier_attachments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads visible attachments of approved non-demo"
ON public.supplier_attachments
FOR SELECT
TO anon, authenticated
USING (
  tipo IN ('galeria','planta_baixa','anexo')
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    WHERE s.id = supplier_id
      AND s.status = 'approved'
      AND COALESCE(p.is_demo, false) = false
  )
);

CREATE TRIGGER trg_supplier_attachments_updated_at
BEFORE UPDATE ON public.supplier_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS on storage.objects for supplier-files bucket
CREATE POLICY "Supplier owner reads own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-files'
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Supplier owner uploads own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-files'
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Supplier owner updates own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'supplier-files'
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Supplier owner deletes own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-files'
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Admins manage supplier-files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'supplier-files' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'supplier-files' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads supplier-files visible"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'supplier-files'
  AND (storage.foldername(name))[2] IN ('galeria','planta_baixa','anexo')
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.status = 'approved'
      AND COALESCE(p.is_demo, false) = false
  )
);
