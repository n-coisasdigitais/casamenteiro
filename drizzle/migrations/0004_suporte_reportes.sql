create table public.suporte_reportes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  origem text not null default 'fornecedor' check (origem in ('fornecedor','profissional','casal')),
  assunto text not null,
  descricao text not null,
  anexo_path text,
  status text not null default 'aberto' check (status in ('aberto','respondido','resolvido')),
  created_at timestamptz not null default now()
);

grant select, insert on public.suporte_reportes to authenticated;
grant all on public.suporte_reportes to service_role;

alter table public.suporte_reportes enable row level security;

create policy "usuario cria proprio reporte" on public.suporte_reportes
  for insert to authenticated with check (user_id = auth.uid());

create policy "usuario ve proprios reportes" on public.suporte_reportes
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "admin atualiza reportes" on public.suporte_reportes
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "usuario envia anexo suporte" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'suporte' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuario le proprio anexo suporte" on storage.objects
  for select to authenticated
  using (bucket_id = 'suporte' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.system_settings (key, value)
values ('suporte_email', '{"email":"carlosbelo@gmail.com"}'::jsonb)
on conflict (key) do nothing;