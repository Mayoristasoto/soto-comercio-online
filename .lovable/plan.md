## Cambios

1. **Sucursal renombrada** ✅ ya aplicado: "10 de Febrero" → "Olazar 26" (también la dirección).

2. **Generar archivo descargable** `empleados_activos_por_sucursal.xlsx` con:
   - **Hoja "Por Sucursal"**: columnas Sucursal, Apellido, Nombre, Legajo, DNI, Puesto, Rol, Email, Fecha Ingreso — ordenado por sucursal y apellido.
   - **Hoja "Resumen"**: cantidad de empleados activos por sucursal + total general.
   - Empleados sin sucursal asignada agrupados como "Sin sucursal".
   - Filtro: `empleados.activo = true`.

El archivo se guarda en `/mnt/documents/` para descarga.