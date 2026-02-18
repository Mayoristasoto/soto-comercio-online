

# Sincronizar datos y carga masiva de datos personales

## Paso 1: Sincronizar DNI existentes

Ejecutar un UPDATE en `empleados_datos_sensibles` para copiar el DNI que ya existe en la tabla `empleados` hacia `empleados_datos_sensibles.dni`, para los registros donde el DNI sensible esta vacio pero el empleado si lo tiene cargado.

Esto se hara con una consulta SQL directa (sin migracion, es un update de datos):

```sql
UPDATE empleados_datos_sensibles eds
SET dni = e.dni
FROM empleados e
WHERE eds.empleado_id = e.id
  AND e.dni IS NOT NULL
  AND (eds.dni IS NULL OR eds.dni = '')
```

Esto sincronizara los ~24 empleados que tienen DNI en `empleados` pero no en `empleados_datos_sensibles`.

## Paso 2: Crear componente de importacion masiva de datos personales

Nuevo archivo: `src/components/admin/DatosPersonalesImport.tsx`

Funcionamiento:

1. El admin sube un archivo Excel (.xlsx) con columnas:
   - **Legajo** (obligatorio, para identificar al empleado)
   - **DNI**
   - **Fecha Nacimiento** (formato DD/MM/AAAA)
   - **Direccion**
   - **Telefono**
   - **Estado Civil**
   - **Contacto Emergencia Nombre**
   - **Contacto Emergencia Telefono**

2. El sistema muestra una tabla de previsualizacion con los datos leidos, marcando en verde los campos que se van a actualizar y en gris los que ya estan completos.

3. Al confirmar, para cada fila:
   - Busca el empleado por legajo
   - Hace un `upsert` en `empleados_datos_sensibles` con los campos provistos
   - Tambien actualiza `empleados.dni` si viene un DNI nuevo

4. Incluye boton para descargar plantilla Excel con las columnas esperadas y los legajos/nombres actuales pre-cargados.

## Paso 3: Integrar en la administracion

Agregar un boton "Importar Datos Personales" en la pagina de Nomina (`src/pages/Nomina.tsx`) o en el area de empleados, que abra el dialogo de importacion.

## Patron a seguir

Se reutiliza el mismo patron del componente `EmployeeImport.tsx` existente:
- Dialogo modal con upload de archivo
- Lectura con la libreria `xlsx` (ya instalada)
- Tabla de previsualizacion antes de confirmar
- Procesamiento fila por fila con feedback de progreso

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| `src/components/admin/DatosPersonalesImport.tsx` | Crear - componente de importacion masiva |
| `src/pages/Nomina.tsx` | Modificar - agregar boton para abrir el importador |

No se requieren migraciones de esquema.
