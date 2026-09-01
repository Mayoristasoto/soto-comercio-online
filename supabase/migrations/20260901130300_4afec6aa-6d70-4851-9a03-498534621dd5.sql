CREATE POLICY "RRHH lee evidencias checklist" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'checklist-evidencias' AND public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "RRHH sube evidencias checklist" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checklist-evidencias' AND public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "RRHH actualiza evidencias checklist" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'checklist-evidencias' AND public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (bucket_id = 'checklist-evidencias' AND public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "RRHH borra evidencias checklist" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'checklist-evidencias' AND public.has_role(auth.uid(), 'admin_rrhh'));