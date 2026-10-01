ALTER TABLE public.novedades_estudio_borradores DROP CONSTRAINT IF EXISTS novedades_estudio_borradores_periodo_key;
ALTER TABLE public.novedades_estudio_borradores
  ADD COLUMN nombre text NOT NULL DEFAULT 'Borrador 1',
  ADD COLUMN origen text NOT NULL DEFAULT 'sistema',
  ADD COLUMN enviada_at timestamptz,
  ADD COLUMN enviada_por uuid,
  ADD COLUMN archivo_path text;
CREATE INDEX IF NOT EXISTS idx_nov_estudio_periodo ON public.novedades_estudio_borradores(periodo);
CREATE POLICY "RRHH lee estudio-contable" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='estudio-contable' AND public.current_user_is_admin());
CREATE POLICY "RRHH sube estudio-contable" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='estudio-contable' AND public.current_user_is_admin());
CREATE POLICY "RRHH actualiza estudio-contable" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='estudio-contable' AND public.current_user_is_admin());
CREATE POLICY "RRHH borra estudio-contable" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='estudio-contable' AND public.current_user_is_admin());