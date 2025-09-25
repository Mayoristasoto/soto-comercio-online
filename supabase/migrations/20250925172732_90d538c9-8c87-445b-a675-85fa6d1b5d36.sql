-- SYSTEMATIC REMOVAL OF SECURITY DEFINER DEPENDENCIES
-- First, drop all policies that depend on current_user_is_admin()

-- Drop all policies that use current_user_is_admin()
DROP POLICY IF EXISTS "Solo admins ven logs de acceso" ON public.empleado_access_log;
DROP POLICY IF EXISTS "Solo admins pueden crear empleados" ON public.empleados;
DROP POLICY IF EXISTS "Solo admins pueden actualizar empleados" ON public.empleados;
DROP POLICY IF EXISTS "Solo admins pueden eliminar empleados" ON public.empleados;
DROP POLICY IF EXISTS "Admins ven todos los empleados" ON public.empleados;
DROP POLICY IF EXISTS "Admins pueden gestionar ubicaciones" ON public.fichado_ubicaciones;
DROP POLICY IF EXISTS "Admins pueden gestionar turnos" ON public.fichado_turnos;
DROP POLICY IF EXISTS "Admins pueden gestionar asignaciones de turno" ON public.empleado_turnos;
DROP POLICY IF EXISTS "Admins pueden ver todos los fichajes" ON public.fichajes;
DROP POLICY IF EXISTS "Admins pueden actualizar fichajes" ON public.fichajes;
DROP POLICY IF EXISTS "Admins pueden gestionar incidencias" ON public.fichaje_incidencias;
DROP POLICY IF EXISTS "Solo admins pueden ver auditoría" ON public.fichaje_auditoria;
DROP POLICY IF EXISTS "Solo admins pueden gestionar configuración" ON public.fichado_configuracion;
DROP POLICY IF EXISTS "Admins pueden gestionar documentos" ON public.empleado_documentos;
DROP POLICY IF EXISTS "Admins pueden gestionar permisos" ON public.empleado_permisos;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins pueden gestionar documentos obligatorios" ON public.documentos_obligatorios;
DROP POLICY IF EXISTS "Admins pueden gestionar asignaciones" ON public.asignaciones_documentos_obligatorios;
DROP POLICY IF EXISTS "Admins pueden ver todas las confirmaciones" ON public.confirmaciones_lectura;
DROP POLICY IF EXISTS "Admins pueden gestionar todas las solicitudes" ON public.solicitudes_vacaciones;
DROP POLICY IF EXISTS "Admins pueden gestionar todas las tareas" ON public.tareas;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.empleados_audit_log;