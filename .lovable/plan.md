## Cambios en pestaña Listado de `/rrhh/vacaciones`

Mantenemos la función SQL actual (`<5→14, <10→21, <20→28, ≥20→35`). Solo agregamos columnas visibles que reflejen la fórmula del Excel:

### `src/components/vacaciones/ListadoVacaciones.tsx`

1. Extender `EmpleadoRow` con:
   - `fecha_ingreso: string | null`
   - `antiguedad_anios: number` (proviene del RPC `obtener_calculo_vacaciones_todos`, que ya calcula `EXTRACT(YEAR FROM AGE(31/12/año, fecha_ingreso))` — equivalente a `=DATEDIF(B2;FECHA(AÑO(HOY());12;31);"Y")`).

2. En `cargar()`, mapear desde `calcRes.data` no solo `dias_segun_ley` sino también `fecha_ingreso` y `antiguedad_anios`. Cargar el dato aunque el empleado no aparezca en `empRes` (mantener filtro por activo).

3. En la tabla principal agregar dos columnas nuevas entre "Empleado/Sucursal" y "LCT":
   - **Fecha ingreso** (formato `dd/MM/yyyy`)
   - **Antigüedad al 31/12** (años, ej. `7 años`)

   La columna **LCT** sigue mostrando `dias_segun_ley` (que ya respeta la regla `<5/<10/<20/≥20`).

4. Actualizar `colSpan` del row expandible (de 8 a 10).

5. Agregar las dos columnas al CSV (`Fecha ingreso`, `Antigüedad`) antes de `Días LCT`.

6. Agregar tooltip/leyenda breve en el `CardDescription`:
   > "Antigüedad calculada al 31/12 del año seleccionado. Días LCT según Art. 150: <5 años=14, <10=21, <20=28, ≥20=35."

### Sin cambios

- No se modifica la función SQL `calcular_vacaciones_ley_argentina` (criterio actual confirmado).
- No se tocan otros componentes ni tabs.

### Resultado

El listado mostrará por cada empleado: Apellido/Nombre, Sucursal, **Fecha ingreso**, **Antigüedad al 31/12**, Días LCT, Pendientes, Aprobadas, Consumidos, Restantes — con el detalle desplegable de solicitudes intacto.