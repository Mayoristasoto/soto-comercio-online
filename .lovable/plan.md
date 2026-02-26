

## Resumen — No se requieren cambios

El sistema ya tiene implementado el flujo completo de firma obligatoria de documentos para empleados nuevos:

### Flujo del empleado (automático)
1. Primer login con PIN → se activa `debe_firmar_documentos_iniciales = true`
2. Modal bloqueante muestra documentos pendientes de firma
3. El empleado firma cada uno (dibujando firma o usando firma guardada)
4. Al completar todos, se desbloquea el dashboard

### Cómo cargar documentos (admin)
1. Ir a **Nómina** (`/nomina`) desde el sidebar
2. Pestaña **"Docs Obligatorios"** → crear documentos con título, descripción, contenido y/o URL
3. Pestaña **"Asignar Documentos"** → asignar documentos a empleados específicos
4. Los empleados con `debe_firmar_documentos_iniciales = true` verán el modal obligatorio en su próximo login

### Tablas involucradas
- `documentos_obligatorios` — catálogo de documentos
- `asignaciones_documentos_obligatorios` — asignación documento ↔ empleado
- `documentos_firmas` — registro de firmas
- `empleados_firmas` — firmas digitales guardadas del empleado

No se necesitan cambios de código ni migraciones. Todo está funcional.

