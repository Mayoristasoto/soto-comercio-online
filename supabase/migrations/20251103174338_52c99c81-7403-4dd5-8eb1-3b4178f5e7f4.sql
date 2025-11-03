-- Asegurar que el bucket exista y sea público
insert into storage.buckets (id, name, public)
values ('facial-photos', 'facial-photos', true)
on conflict (id) do update set public = true;

-- Limpiar políticas previas conflictivas en storage.objects para este bucket
drop policy if exists "Public read facial photos" on storage.objects;
drop policy if exists "Kiosk upload facial photos to employee folder" on storage.objects;

-- Permitir lectura pública de las fotos del bucket (necesario para previsualizar)
create policy "Public read facial photos"
on storage.objects
for select
to public
using ( bucket_id = 'facial-photos' );

-- Permitir subida desde el kiosco (sin autenticación) solo a carpetas que correspondan
-- a un empleado activo: path "<empleado_id>/<archivo>"
create policy "Kiosk upload facial photos to employee folder"
on storage.objects
for insert
to public
with check (
  bucket_id = 'facial-photos'
  and (storage.foldername(name))[1] is not null
  and exists (
    select 1 from public.empleados e
    where e.id::text = (storage.foldername(name))[1]
      and e.activo = true
  )
);
