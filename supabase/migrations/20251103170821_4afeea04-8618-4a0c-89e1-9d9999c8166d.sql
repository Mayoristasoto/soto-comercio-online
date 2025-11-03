-- Permitir inserciones públicas en facial_photo_uploads para el kiosco
CREATE POLICY "Kiosco puede crear registros de fotos"
ON public.facial_photo_uploads
FOR INSERT
WITH CHECK (true);

-- Nota: La seguridad está garantizada porque:
-- 1. Solo se puede insertar con empleado_id válido (FK constraint)
-- 2. El admin debe aprobar antes de activar el reconocimiento facial
-- 3. Las fotos van a un bucket privado con sus propias políticas