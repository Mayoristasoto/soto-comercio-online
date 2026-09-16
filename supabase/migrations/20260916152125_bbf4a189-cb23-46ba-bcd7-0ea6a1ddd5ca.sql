DROP POLICY IF EXISTS "candidatos_gerente_lee" ON public.candidatos;
DROP POLICY IF EXISTS "entrevistas_gerente_lee" ON public.entrevistas;
DROP POLICY IF EXISTS "invitaciones_gerente_lee" ON public.entrevistas_invitaciones;
DROP POLICY IF EXISTS "puestos_reclutamiento_lectura" ON public.reclutamiento_puestos;
DROP POLICY IF EXISTS "entrevistas_config_lectura" ON public.entrevistas_config;
DROP POLICY IF EXISTS "disponibilidad_lectura" ON public.entrevistas_disponibilidad;
DROP POLICY IF EXISTS "excepciones_lectura" ON public.entrevistas_excepciones;
DROP POLICY IF EXISTS "slots_lectura" ON public.entrevistas_slots;