
-- Unify document templates: add categories and create-new support
ALTER TABLE public.plantillas_documentos
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'otros',
  ADD COLUMN IF NOT EXISTS tipo_elemento text,
  ADD COLUMN IF NOT EXISTS es_sistema boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variables_extra jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Mark existing vacation templates as system
UPDATE public.plantillas_documentos
SET categoria = 'vacaciones', es_sistema = true
WHERE codigo IN ('vacaciones_otorgamiento','vacaciones_goce');

-- Migrate existing element templates into the unified table
INSERT INTO public.plantillas_documentos
  (codigo, nombre, descripcion, categoria, tipo_elemento, contenido_html, ciudad_default, es_sistema, activa, variables_extra)
SELECT
  'entrega_' || lower(regexp_replace(pe.nombre, '[^a-zA-Z0-9]+', '_', 'g')) || '_' || substr(pe.id::text,1,6) AS codigo,
  pe.nombre,
  'Migrada desde plantillas_elementos',
  'entregas',
  pe.tipo_elemento,
  COALESCE(pe.template_html, ''),
  'Mar del Plata',
  false,
  pe.activo,
  '["item","detalle","cantidad","talla","observaciones","tipo_elemento"]'::jsonb
FROM public.plantillas_elementos pe
WHERE NOT EXISTS (
  SELECT 1 FROM public.plantillas_documentos pd
  WHERE pd.categoria = 'entregas' AND pd.nombre = pe.nombre
);

-- Seed a generic delivery template if none exists
INSERT INTO public.plantillas_documentos
  (codigo, nombre, descripcion, categoria, contenido_html, ciudad_default, es_sistema, activa, variables_extra)
SELECT
  'entrega_generica',
  'Comprobante de Entrega (genérico)',
  'Recibo genérico de entrega de elementos al empleado',
  'entregas',
  '<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Por la presente <strong>{{empleado}}</strong> (DNI {{dni}}, Legajo {{legajo}}) deja constancia de haber recibido en perfecto estado el/los siguiente(s) elemento(s):</p><p><strong>Elemento:</strong> {{item}}<br/><strong>Cantidad:</strong> {{cantidad}}<br/><strong>Talla / Detalle:</strong> {{talla}}<br/><strong>Observaciones:</strong> {{observaciones}}</p><p>Se compromete a su cuidado, uso responsable y devolución en caso de desvinculación o cuando la empresa así lo requiera.</p>',
  'Mar del Plata',
  true,
  true,
  '["item","detalle","cantidad","talla","observaciones"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.plantillas_documentos WHERE codigo='entrega_generica');

-- Seed constancia de trabajo
INSERT INTO public.plantillas_documentos
  (codigo, nombre, descripcion, categoria, contenido_html, ciudad_default, es_sistema, activa, variables_extra)
SELECT
  'constancia_trabajo',
  'Constancia de Trabajo',
  'Constancia laboral simple para presentar ante terceros',
  'notas',
  '<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Por la presente se deja constancia que <strong>{{empleado}}</strong>, DNI {{dni}}, Legajo {{legajo}}, se desempeña en esta empresa en el puesto de <strong>{{puesto}}</strong> en la sucursal <strong>{{sucursal}}</strong>.</p><p>La presente se extiende a pedido del interesado a los fines que estime corresponder.</p>',
  'Mar del Plata',
  true,
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.plantillas_documentos WHERE codigo='constancia_trabajo');

-- Seed notificación de sanción
INSERT INTO public.plantillas_documentos
  (codigo, nombre, descripcion, categoria, contenido_html, ciudad_default, es_sistema, activa, variables_extra)
SELECT
  'notificacion_sancion',
  'Notificación de Sanción Disciplinaria',
  'Acta de notificación de apercibimiento / suspensión',
  'sanciones',
  '<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Por la presente se notifica a <strong>{{empleado}}</strong> (DNI {{dni}}, Legajo {{legajo}}), que desempeña el puesto de {{puesto}} en {{sucursal}}, que en virtud de los hechos descriptos a continuación:</p><p><em>{{motivo}}</em></p><p>La empresa procede a aplicar la siguiente sanción: <strong>{{sancion}}</strong>, conforme las facultades disciplinarias previstas por la LCT.</p>',
  'Mar del Plata',
  true,
  true,
  '["motivo","sancion"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.plantillas_documentos WHERE codigo='notificacion_sancion');

CREATE INDEX IF NOT EXISTS idx_plantillas_documentos_categoria ON public.plantillas_documentos(categoria);
