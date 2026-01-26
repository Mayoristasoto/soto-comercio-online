

## Plan: Editor Temporal de Fechas de Ingreso para Calculadora de Vacaciones

### Objetivo
Crear una pagina temporal de administracion que permita editar rapidamente las fechas de ingreso de los empleados para usar en la Calculadora de Vacaciones LCT.

---

### Componente a Crear

**Archivo:** `src/pages/EditorFechasIngreso.tsx`

Esta pagina mostrara una tabla editable con:
- Listado de todos los empleados activos
- Fecha de ingreso actual (editable inline)
- Dias de vacaciones calculados segun LCT en tiempo real
- Indicador visual de empleados sin fecha de ingreso
- Boton de guardado por fila
- Boton de guardado masivo

**Estructura visual:**
```text
+----------------------------------------------------------+
| EDITOR DE FECHAS DE INGRESO                              |
| (Herramienta temporal para ajustar datos de vacaciones)  |
+----------------------------------------------------------+
| [Buscar empleado...] [Filtrar sucursal v] [Guardar Todo] |
+----------------------------------------------------------+
| # | Empleado          | Legajo | Fecha Ingreso | Ant.   |
|---|-------------------|--------|---------------|--------|
| 1 | Aragon, Marina    | 25     | [26/06/2024]  | 2a 6m  |
| 2 | Bartolo L., W.    | 1      | [01/08/2022]  | 4a 4m  |
| 3 | Galeote, Mariano  | 7      | [01/04/2015]  | 11a 8m |
+----------------------------------------------------------+
| Dias LCT calculados se muestran al lado de cada fecha    |
+----------------------------------------------------------+
```

---

### Detalles Tecnicos

**Estados del componente:**
```typescript
interface EmpleadoEditable {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  fecha_ingreso: string | null;
  fecha_ingreso_nueva: string | null; // Para edicion
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  modificado: boolean;
}
```

**Funcionalidades:**
1. Carga todos los empleados activos con su fecha de ingreso
2. Permite editar la fecha inline con un date picker
3. Calcula en tiempo real los dias de vacaciones segun LCT
4. Muestra indicador visual cuando hay cambios sin guardar
5. Permite guardar por fila individual o masivamente
6. Filtro por sucursal y busqueda por nombre/legajo
7. Exportar listado a Excel

**Flujo de guardado:**
- UPDATE directo a la tabla `empleados` (campo `fecha_ingreso`)
- Toast de confirmacion con cantidad de registros actualizados
- Recarga automatica de datos tras guardar

---

### Ruta y Navegacion

**Ruta:** `/admin/editor-fechas-ingreso`

**Archivo a modificar:** `src/App.tsx`
- Agregar nueva ruta dentro del AdminLayout

**Acceso temporal:**
- Solo visible para usuarios con rol `admin_rrhh`
- Boton de acceso desde la pestania "Calculadora LCT" en Vacaciones

---

### Modificaciones Adicionales

**Archivo:** `src/components/vacaciones/CalculadoraVacaciones.tsx`
- Agregar boton "Editar Fechas de Ingreso" que navega a la nueva pagina
- Posicionado junto al boton "Recalcular Todos"

---

### Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/pages/EditorFechasIngreso.tsx` | Crear | Nueva pagina de edicion |
| `src/App.tsx` | Modificar | Agregar ruta `/admin/editor-fechas-ingreso` |
| `src/components/vacaciones/CalculadoraVacaciones.tsx` | Modificar | Agregar boton de acceso |

---

### Seguridad

- La pagina verificara que el usuario tenga rol `admin_rrhh` antes de permitir ediciones
- Los UPDATE se realizan directamente a la tabla `empleados` que ya tiene RLS configurado
- Log de cambios en consola para auditoria basica

---

### Resultado Final

Una herramienta administrativa temporal que permite:
1. Ver todos los empleados con sus fechas de ingreso actuales
2. Editar rapidamente las fechas para corregir datos
3. Ver en tiempo real como cambian los dias de vacaciones segun LCT
4. Guardar los cambios y volver a la Calculadora de Vacaciones

