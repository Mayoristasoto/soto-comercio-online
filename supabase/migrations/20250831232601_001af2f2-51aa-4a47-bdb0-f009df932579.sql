-- Agregar políticas RLS faltantes para las tablas que no tienen

-- Políticas para desafíos
CREATE POLICY "Usuarios autenticados pueden ver desafíos activos"
ON public.desafios FOR SELECT
USING (auth.uid() IS NOT NULL AND estado = 'activo');

CREATE POLICY "Admins pueden gestionar desafíos"
ON public.desafios FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para participaciones
CREATE POLICY "Empleados pueden ver sus propias participaciones"
ON public.participaciones FOR SELECT
USING (empleado_id = public.get_current_empleado() OR 
       (grupo_id IS NOT NULL AND grupo_id IN (
         SELECT grupo_id FROM public.empleados WHERE id = public.get_current_empleado()
       )));

CREATE POLICY "Empleados pueden crear participaciones"
ON public.participaciones FOR INSERT
WITH CHECK (empleado_id = public.get_current_empleado() OR 
            (grupo_id IS NOT NULL AND grupo_id IN (
              SELECT grupo_id FROM public.empleados WHERE id = public.get_current_empleado()
            )));

CREATE POLICY "Admins pueden gestionar participaciones"
ON public.participaciones FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para premios
CREATE POLICY "Usuarios autenticados pueden ver premios activos"
ON public.premios FOR SELECT
USING (auth.uid() IS NOT NULL AND activo = true);

CREATE POLICY "Admins pueden gestionar premios"
ON public.premios FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para asignaciones de premio
CREATE POLICY "Empleados pueden ver sus propias asignaciones"
ON public.asignaciones_premio FOR SELECT
USING (beneficiario_tipo = 'empleado' AND beneficiario_id::uuid = public.get_current_empleado());

CREATE POLICY "Admins pueden gestionar asignaciones"
ON public.asignaciones_premio FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para puntos
CREATE POLICY "Empleados pueden ver sus propios puntos"
ON public.puntos FOR SELECT
USING (empleado_id = public.get_current_empleado());

CREATE POLICY "Admins pueden gestionar puntos"
ON public.puntos FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para insignias
CREATE POLICY "Usuarios autenticados pueden ver insignias activas"
ON public.insignias FOR SELECT
USING (auth.uid() IS NOT NULL AND activa = true);

CREATE POLICY "Admins pueden gestionar insignias"
ON public.insignias FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para insignias de empleados
CREATE POLICY "Empleados pueden ver sus propias insignias"
ON public.insignias_empleado FOR SELECT
USING (empleado_id = public.get_current_empleado());

CREATE POLICY "Admins pueden gestionar insignias de empleados"
ON public.insignias_empleado FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Arreglar search_path en las funciones que faltaban
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear empleado si el email no existe ya
  IF NOT EXISTS (SELECT 1 FROM public.empleados WHERE email = NEW.email) THEN
    INSERT INTO public.empleados (
      user_id,
      nombre,
      apellido,
      email,
      rol
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nombre', 'Nuevo'),
      COALESCE(NEW.raw_user_meta_data ->> 'apellido', 'Usuario'),
      NEW.email,
      'empleado'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando empleado para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;