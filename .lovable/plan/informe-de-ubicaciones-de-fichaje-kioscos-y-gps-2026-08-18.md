# Informe de ubicaciones de fichaje (kioscos y GPS)

Objetivo: saber desde dónde fichó cada empleado, agrupando las coordenadas GPS en puntos con nombre (kioscos de los locales) y asignándoles un centro de costo, con selección de empleados por checkbox para el informe.

## Estado actual verificado
- `fichajes` guarda `latitud`/`longitud`: 11.241 de 13.284 registros tienen GPS (desde 24/09/2025).
- En los últimos 60 días hay 2 grupos claros de coordenadas: ~(-38.044, -57.573) con 1.562 fichajes y ~(-38.000, -57.597) con 771. Falta el tercer local.
- La tabla `fichado_ubicaciones` (nombre, lat, lon, radio_metros, sucursal_id) existe pero está **vacía**.
- La tabla `centros_costo` existe y está **vacía**.
- Sucursales activas: José Martí, Juan B. Justo, Olazar 26, Administración, Ventas.

## Qué se construye

### 1. Puntos de fichaje con nombre (base de datos)
- Agregar `centro_costo_id` a `fichado_ubicaciones` (opcional) para vincular cada punto a un centro de costo.
- Crear los 3 centros de costo de locales (José Martí, Juan B. Justo, Olazar 26) tipo operativo.
- Crear los 3 puntos/kioscos con nombre ("Kiosco José Martí", etc.), cada uno con lat/lon y radio en metros (default 150 m) para absorber la variación mínima del GPS.
- Las coordenadas de los 2 grupos detectados se precargan; el tercero se completa desde la pantalla de configuración cuando haya fichajes.

### 2. Pantalla de administración de puntos
Sección nueva dentro de la configuración de fichado: alta/edición de puntos (nombre, sucursal, centro de costo, lat/lon, radio, activo), con un botón "Detectar desde fichajes" que lista los grupos de coordenadas más frecuentes sin punto asignado para crearlos con un clic.

### 3. Informe "Ubicaciones de fichaje"
Página nueva en RRHH / Fichero con:
- Filtros: rango de fechas, sucursal, grupo de empleados (usando el selector de grupos ya existente), y **lista de empleados con checkbox** (seleccionar todos / ninguno) para decidir quién sale en el informe.
- Clasificación de cada fichaje por distancia al punto más cercano:
  - dentro del radio -> nombre del kiosco + centro de costo;
  - fuera de todos los radios -> "Fuera de ubicación" con la distancia al punto más cercano y link a Google Maps;
  - sin coordenadas -> "Sin GPS".
- Marca de origen probable: fichajes con método facial desde el kiosco vs. fichajes con PIN desde celular (se distinguen por método y por dispersión de coordenadas), mostrada como columna "Origen".
- Dos vistas: **Detalle** (empleado, fecha/hora, tipo, punto, centro de costo, distancia, coordenadas) y **Resumen** (por empleado: cantidad de fichajes por punto/centro de costo y % fuera de ubicación).
- Exportación a Excel (hojas Detalle y Resumen) y a PDF, respetando exactamente los empleados tildados.

## Detalles técnicos
- Migración: `ALTER TABLE public.fichado_ubicaciones ADD COLUMN centro_costo_id uuid REFERENCES public.centros_costo(id)`; inserts de centros de costo y puntos iniciales; función `public.distancia_metros(lat1, lon1, lat2, lon2)` (Haversine, IMMUTABLE) y RPC `get_fichajes_ubicaciones(p_desde, p_hasta, p_empleados uuid[])` SECURITY DEFINER que devuelve cada fichaje con el punto más cercano, la distancia y el centro de costo, restringida a roles admin/gerente.
- Frontend: `src/pages/UbicacionesFichaje.tsx` + componentes en `src/components/fichero/` (tabla, filtros con checkboxes, resumen), export en `src/utils/ubicacionesFichajeExport.ts`, ruta registrada en `App.tsx` y link en el sidebar de RRHH.
- Fechas y horas siempre con `src/lib/dateUtils.ts` (Argentina UTC-3).
