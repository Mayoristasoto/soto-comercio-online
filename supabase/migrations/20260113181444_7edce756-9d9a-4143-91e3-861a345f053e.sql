-- 1. Agregar columnas para asignación específica en plantillas
ALTER TABLE tareas_plantillas 
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id),
ADD COLUMN IF NOT EXISTS empleados_asignados UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hora_generacion TIME DEFAULT '06:00:00',
ADD COLUMN IF NOT EXISTS ultima_generacion DATE;

-- 2. Tabla para log de tareas generadas automáticamente
CREATE TABLE IF NOT EXISTS tareas_generadas_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID REFERENCES tareas_plantillas(id) ON DELETE CASCADE,
  tarea_id UUID REFERENCES tareas(id) ON DELETE SET NULL,
  empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_generacion DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_tareas_generadas_unique 
ON tareas_generadas_log(plantilla_id, empleado_id, fecha_generacion);

-- RLS para tareas_generadas_log
ALTER TABLE tareas_generadas_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tareas_generadas_log"
ON tareas_generadas_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert tareas_generadas_log"
ON tareas_generadas_log FOR INSERT
TO authenticated
WITH CHECK (true);