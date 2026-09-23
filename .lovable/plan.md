# Distribución de sueldos y cargas sociales por centro de costo (según fichadas)

## Qué información hay hoy
- **Fichadas con ubicación:** en los últimos 60 días, 2.537 de 2.539 fichadas tienen GPS (99,9%). El PIN ya exige GPS, y el reconocimiento facial también lo registra casi siempre. Solo 1 fichada manual no tiene ubicación.
- **Centros de costo:** existen José Martí, Juan B. Justo y Olazar 26. **Falta Administración.**
- **Puntos de fichaje:** el Kiosco Olazar 26 está creado pero **sin coordenadas** (lat 0), así que hoy sus fichadas no se pueden asignar. Martí y Juan B. Justo están bien.
- **Sueldos:** no hay recibos cargados todavía. El porcentaje se puede calcular igual; el monto en pesos aparece cuando cargues sueldos (pestaña Sueldos) y cargas sociales.

Conclusión: la ubicación ya es suficiente. Faltan el centro Administración y las coordenadas de Olazar. Igual propongo que el GPS sea obligatorio también en fichadas faciales y manuales.

## Qué se construye
1. **Nueva pestaña "Distribución de costos"** en Finanzas > Rentabilidad.
   - Elegís el período (mes) y la sucursal (opcional).
   - Por empleado muestra las horas trabajadas en cada centro según dónde fichó: entrada y salida emparejadas, y cada tramo va al punto más cercano dentro del radio. Con eso calcula el % por centro (ej.: Martí 70%, Juan B. Justo 30%).
   - Con los sueldos cargados, reparte el sueldo bruto y las cargas sociales del empleado según ese %, con totales por centro.
   - Si un empleado no tiene fichadas válidas o está en Administración, se asigna 100% a su centro fijo. Se toma el centro de su sucursal o uno elegido a mano.
   - **Ajuste manual:** podés corregir los % de un empleado antes de confirmar, siempre sumando 100%.
   - Botón **"Confirmar distribución"**: guarda los % del mes. Rentabilidad y el Dashboard usan esos % en vez de asignar todo a la sucursal principal.
   - Aviso de fichadas "fuera de ubicación" o "sin GPS" que no se pudieron asignar, con la cantidad por empleado.
   - Exportar a Excel.
2. **Centro Administración:** se crea el centro y se permite fijar empleados 100% a Administración, aunque fichen en un local.
3. **Olazar 26:** se completan sus coordenadas desde la pantalla de puntos de fichaje, con el botón "Detectar desde fichajes", o las cargo si me las pasás.
4. **GPS obligatorio en todas las fichadas:** el kiosco facial no deja fichar sin ubicación, igual que ya pasa con el PIN. El mensaje pide activar la ubicación.

## Detalles técnicos
- Migración: insertar el centro de costo "Administración" (tipo administrativo). Crear la tabla `distribucion_costos_empleado` con: periodo_id, empleado_id, centro_costo_id, horas, porcentaje, origen (fichadas/manual/fijo), confirmado_por y timestamps. Tendrá GRANTs, RLS solo para admin_rrhh y un único registro por (periodo, empleado, centro). Agregar `centro_costo_fijo_id` opcional en `empleados_configuracion_payroll`.
- Crear el RPC `calcular_distribucion_costos(p_desde date, p_hasta date)` como SECURITY DEFINER y solo para admin. Empareja entrada→salida (descontando pausas), clasifica cada tramo con `distancia_metros` contra `fichado_ubicaciones` activas y devuelve horas por empleado y centro.
- Frontend: `src/components/rentabilidad/DistribucionCostos.tsx` y una nueva pestaña en `Rentabilidad.tsx`. `DashboardRentabilidad` pasa a usar los % confirmados para el costo laboral por centro.
- Kiosco facial: bloquear el registro si no hay coordenadas, reutilizando la lógica del PIN.
- Fechas en hora Argentina (`dateUtils`).
