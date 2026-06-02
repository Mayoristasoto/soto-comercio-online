
CREATE TABLE public.instructivos_editables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  secciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  actualizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructivos_editables TO authenticated;
GRANT ALL ON public.instructivos_editables TO service_role;

ALTER TABLE public.instructivos_editables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura para gerentes y admin RRHH"
  ON public.instructivos_editables FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_rrhh'::user_role)
    OR public.has_role(auth.uid(), 'gerente_sucursal'::user_role)
  );

CREATE POLICY "Solo admin RRHH puede insertar"
  ON public.instructivos_editables FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "Solo admin RRHH puede actualizar"
  ON public.instructivos_editables FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "Solo admin RRHH puede eliminar"
  ON public.instructivos_editables FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

INSERT INTO public.instructivos_editables (slug, titulo, descripcion, secciones)
VALUES (
  'gerente-vacaciones',
  'Guía para Gerentes de Sucursal',
  'Manual de capacitación: acceso al sistema y aprobación de vacaciones (1ra instancia).',
  '[
    {
      "id": "acceso",
      "orden": 1,
      "titulo": "1. Acceso al sistema",
      "contenido": "## URL del sistema\nIngresar a https://mayoristasoto.site desde cualquier navegador moderno (Chrome, Edge, Safari).\n\n## Primer ingreso\n- **Usuario:** tu correo electrónico registrado por RRHH.\n- **PIN inicial:** los últimos 4 dígitos de tu DNI.\n- El sistema te pedirá **cambiar la contraseña** en el primer login.\n\n## Política de contraseña\n- Mínimo 8 caracteres.\n- Al menos 1 mayúscula, 1 minúscula y 1 número.\n\n## Alternativas de ingreso\n- **Reconocimiento facial:** disponible si tenés foto cargada y aprobada.\n- **PIN:** ingreso rápido desde el Kiosco de la sucursal."
    },
    {
      "id": "dashboard",
      "orden": 2,
      "titulo": "2. Dashboard del Gerente",
      "contenido": "Al iniciar sesión verás tu **Dashboard** con:\n- Tu nombre, sucursal y rol en la parte superior.\n- **Sidebar izquierdo** con los módulos disponibles según tu rol.\n- Acceso rápido a Vacaciones, Tareas, Fichero, Reportes.\n\nUsá siempre el botón **Cerrar sesión** al terminar tu jornada."
    },
    {
      "id": "aprobacion-vacaciones",
      "orden": 3,
      "titulo": "3. Aprobación de vacaciones (1ra instancia)",
      "contenido": "## Ruta de acceso\n**RRHH → Vacaciones → pestaña Aprobaciones**\n\n## Paso a paso\n1. Ingresar al módulo de **Vacaciones**.\n2. Seleccionar la pestaña **Aprobaciones**.\n3. Ver el listado de **solicitudes pendientes** de empleados de tu sucursal.\n4. Revisar fechas, motivo y datos del empleado.\n5. (Opcional) Agregar un comentario en el cuadro de texto.\n6. Hacer clic en **Aprobar** o **Rechazar**.\n   - Si rechazás, el **comentario es obligatorio** explicando el motivo.\n7. Al aprobar, el sistema **genera automáticamente el comprobante PDF** para que el empleado lo firme.\n\n## Importante\n- Tu aprobación es de **1ra instancia**. El empleado todavía debe esperar la **aprobación final de admin_rrhh**.\n- No podés aprobar tus propias solicitudes."
    },
    {
      "id": "reglas",
      "orden": 4,
      "titulo": "4. Reglas de negocio y validaciones",
      "contenido": "El sistema bloquea automáticamente:\n- Solicitudes en **diciembre completo**.\n- **Receso invernal** (vacaciones de invierno escolares).\n- **Última semana de noviembre**.\n- **Feriados nacionales** según calendario oficial.\n- Solapamientos con otros empleados del **mismo rol y sucursal** (conflictos de cobertura).\n\nSi una solicitud cae en estos períodos, el sistema te avisa antes de aprobar."
    },
    {
      "id": "faqs",
      "orden": 5,
      "titulo": "5. Preguntas frecuentes",
      "contenido": "**No veo la pestaña Aprobaciones**\n- Verificá que tu rol sea `gerente_sucursal`. Si no, contactá a RRHH.\n\n**No aparece un empleado de mi sucursal**\n- Revisá en Admin → Empleados que tenga la sucursal correctamente asignada.\n\n**¿Puedo modificar una solicitud ya aprobada?**\n- No. Contactá a admin_rrhh para anularla.\n\n**El PDF de comprobante es obligatorio**\n- Sí, el empleado debe firmarlo para que la aprobación final sea válida.\n\n**¿Puedo aprobar desde el celular?**\n- Sí, el sistema es responsive."
    },
    {
      "id": "buenas-practicas",
      "orden": 6,
      "titulo": "6. Buenas prácticas",
      "contenido": "- Revisá las solicitudes pendientes **al menos 2 veces por semana**.\n- **Coordiná con el empleado** antes de aprobar fechas largas.\n- Siempre **explicá el motivo** cuando rechaces una solicitud.\n- **Cerrá sesión** al terminar tu turno para evitar accesos indebidos.\n- Si tenés dudas sobre una solicitud, contactá a **admin_rrhh** antes de aprobar."
    }
  ]'::jsonb
);
