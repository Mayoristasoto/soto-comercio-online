create table public.reportes_rapidos (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  sucursal_id uuid references public.sucursales(id) on delete set null,
  comentario text,
  storage_path text not null,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.reportes_rapidos to authenticated;
grant all on public.reportes_rapidos to service_role;

alter table public.reportes_rapidos enable row level security;

create policy reportes_insert_propio on public.reportes_rapidos for insert to authenticated
  with check (empleado_id = public.current_empleado_id());

create policy reportes_select on public.reportes_rapidos for select to authenticated
  using (empleado_id = public.current_empleado_id() or public.is_admin_rrhh() or public.is_gerente_de_sucursal(sucursal_id));

create policy reportes_delete on public.reportes_rapidos for delete to authenticated
  using (empleado_id = public.current_empleado_id() or public.is_admin_rrhh());

create policy reportes_update on public.reportes_rapidos for update to authenticated
  using (public.is_admin_rrhh() or public.is_gerente_de_sucursal(sucursal_id))
  with check (public.is_admin_rrhh() or public.is_gerente_de_sucursal(sucursal_id));

create trigger trg_reportes_rapidos_updated_at before update on public.reportes_rapidos
  for each row execute function public.handle_updated_at();

create policy reportes_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'checklist-evidencias' and (storage.foldername(name))[1] = 'reportes-rapidos' and (storage.foldername(name))[2] = (public.current_empleado_id())::text);

create policy reportes_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'checklist-evidencias' and (storage.foldername(name))[1] = 'reportes-rapidos');

create policy reportes_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'checklist-evidencias' and (storage.foldername(name))[1] = 'reportes-rapidos' and ((storage.foldername(name))[2] = (public.current_empleado_id())::text or public.is_admin_rrhh()));