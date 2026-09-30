CREATE OR REPLACE FUNCTION public.empleado_activo_por_texto(p_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.empleados WHERE id::text = p_id AND activo = true)
$$;
GRANT EXECUTE ON FUNCTION public.empleado_activo_por_texto(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Kiosk upload facial photos to employee folder" ON storage.objects;
CREATE POLICY "Kiosk upload facial photos to employee folder" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'facial-photos' AND (storage.foldername(name))[1] IS NOT NULL
  AND public.empleado_activo_por_texto((storage.foldername(name))[1]));