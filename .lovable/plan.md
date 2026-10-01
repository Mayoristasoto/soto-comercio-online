# Notas rápidas para el Estudio Contable desde el Dashboard

## Objetivo
RRHH puede anotar al momento cualquier novedad de un empleado, aunque no venga del sistema. La nota cae sola en la planilla del Estudio de ese mes: al costado del nombre (columna Observaciones), abajo (Anotaciones generales) o en los dos lugares.

## Qué se agrega

1. **Tarjeta "Novedades para el Estudio" en el Dashboard** (solo RRHH)
   - Buscador de empleado, texto de la nota y dónde va: **Al lado del nombre**, **Anotaciones generales** o **Ambos**.
   - Mes: sugiere el mes en curso. Si hoy es antes del día de envío (día hábil siguiente al cierre), sugiere el mes que acaba de cerrar. Se puede cambiar.
   - Botón "Guardar" que se puede usar desde el celular.
   - Lista corta de las notas del mes, con editar y borrar.
   - Aviso de envío: "Envío al estudio: lunes 03/11 (faltan 2 días) — 5 notas cargadas". Se calcula con fines de semana y feriados del sistema. Ese día la tarjeta se resalta.
   - Botón "Abrir planilla", que lleva a la planilla del mes en Novedades para Liquidación.

2. **En la planilla del Estudio**
   - Las notas del mes se suman solas a todas las versiones en borrador:
     - "Al lado del nombre": se agregan en Observaciones de ese empleado, por ejemplo `RECIBO POR 8HS - ADELANTO $50.000 - <nota>`.
     - "Anotaciones generales": aparecen como `APELLIDO NOMBRE <nota>`.
   - Se distinguen con color amarillo, de carga manual, y una etiqueta "nota RRHH" en la vista grilla.
   - Al marcar una versión como enviada, las notas quedan fijas en esa versión, tal como se mandaron.

3. **En el perfil del empleado** (opcional y liviano): sección "Notas para el Estudio" con el historial de notas de esa persona.

## Detalles técnicos
- Tabla nueva `novedades_estudio_notas` con las columnas `periodo` (YYYY-MM), `empleado_id`, `texto`, `destino` ('obs' | 'general' | 'ambos'), `created_by`, `created_at` y `updated_at`. Incluye GRANT a authenticated y service_role, y RLS solo para admin_rrhh.
- Helper `src/lib/envioEstudio.ts` con `fechaEnvioEstudio(periodo)`, que devuelve el primer día hábil después de fin de mes usando `dias_feriados` y la zona horaria de Argentina, y con `periodoSugerido(hoy)`.
- Componente `NotasEstudioCard.tsx` en `Dashboard.tsx`, visible solo con `rolConPreview === 'admin_rrhh'`.
- `EditorEstudioContable` carga las notas del período. Si el estado es borrador, las fusiona al armar las filas: suma texto a `obs` y agrega líneas a las anotaciones, sin pisar las ediciones manuales. En `marcarEnviada`, las notas fusionadas se guardan dentro de `overrides` y `anotaciones` de la versión, así queda fija.
- No se tocan ni el cálculo automático ni los otros exports.
