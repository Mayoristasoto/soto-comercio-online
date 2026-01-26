
## Plan: Calculadora de Vacaciones según Ley Argentina LCT

### Objetivo
Crear una nueva sección administrativa para calcular y gestionar los días de vacaciones de cada empleado según la Ley de Contrato de Trabajo argentina, incluyendo:
1. Visualizar empleados sin fecha de ingreso (actualmente no hay ninguno)
2. Calcular días de vacaciones según antigüedad al 31/12 del año correspondiente
3. Recalcular masivamente los saldos de todos los empleados

---

### Reglas de Cálculo (Ley Argentina - Art. 150 LCT)

```text
+---------------------+------------------+
| Antiguedad al 31/12 | Dias Corridos    |
+---------------------+------------------+
| Menos de 6 meses    | 1 dia c/20 dias  |
| Menos de 5 anios    | 14 dias          |
| 5 a 10 anios        | 21 dias          |
| 10 a 20 anios       | 28 dias          |
| Mas de 20 anios     | 35 dias          |
+---------------------+------------------+

Requisito: Haber trabajado al menos mitad de los dias habiles del anio
Periodo de goce: 1 octubre - 30 abril del anio siguiente
```

---

### Componentes a Crear

#### 1. Nuevo Componente: `CalculadoraVacaciones.tsx`

**Ubicacion:** `src/components/vacaciones/CalculadoraVacaciones.tsx`

**Funcionalidades:**
- Tabla de todos los empleados con:
  - Nombre, Apellido, Legajo
  - Fecha de ingreso
  - Antiguedad (anios y meses)
  - Dias que le corresponden segun ley
  - Dias actuales en sistema
  - Diferencia (si hay discrepancia)
- Alerta visual para empleados sin fecha de ingreso
- Filtro por sucursal
- Boton "Recalcular Todos" para actualizar masivamente
- Exportar a Excel con el detalle

**Estructura visual:**
```text
+--------------------------------------------------+
| CALCULADORA DE VACACIONES - LEY ARGENTINA        |
+--------------------------------------------------+
| [Filtrar por sucursal v]  [Recalcular Todos]    |
|                           [Exportar Excel]       |
+--------------------------------------------------+
| Empleados sin fecha de ingreso: 0                |
| (Si hubiera, mostrar alerta con lista)           |
+--------------------------------------------------+
| # | Empleado      | Ingreso    | Ant. | Dias  |  |
|---|---------------|------------|------|-------|  |
| 1 | Juan I. Soto  | 12/11/2010 | 16a  | 28    |  |
| 2 | Maria C. Soto | 01/01/2014 | 12a  | 28    |  |
| 3 | M. Galeote    | 01/04/2015 | 11a  | 28    |  |
| 4 | Analia Del V. | 01/11/2017 | 9a   | 21    |  |
+--------------------------------------------------+
```

---

### Modificaciones a la Base de Datos

#### 1. Nueva Funcion RPC: `calcular_vacaciones_ley_argentina`

Reemplaza la logica actual con el calculo correcto:

```sql
CREATE OR REPLACE FUNCTION calcular_vacaciones_ley_argentina(
  p_empleado_id UUID,
  p_anio INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_fecha_ingreso DATE;
  v_fecha_calculo DATE;
  v_antiguedad_anios INTEGER;
  v_antiguedad_meses INTEGER;
  v_dias_trabajados INTEGER;
  v_dias_vacaciones NUMERIC;
BEGIN
  -- Obtener fecha de ingreso
  SELECT fecha_ingreso INTO v_fecha_ingreso
  FROM empleados WHERE id = p_empleado_id;
  
  IF v_fecha_ingreso IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Fecha de calculo: 31 de diciembre del anio
  v_fecha_calculo := MAKE_DATE(p_anio, 12, 31);
  
  -- Si aun no ingreso para ese anio
  IF v_fecha_ingreso > v_fecha_calculo THEN
    RETURN 0;
  END IF;
  
  -- Calcular antiguedad
  v_antiguedad_anios := EXTRACT(YEAR FROM AGE(v_fecha_calculo, v_fecha_ingreso));
  v_antiguedad_meses := EXTRACT(YEAR FROM AGE(v_fecha_calculo, v_fecha_ingreso)) * 12 
                      + EXTRACT(MONTH FROM AGE(v_fecha_calculo, v_fecha_ingreso));
  
  -- Aplicar reglas LCT Argentina
  IF v_antiguedad_meses < 6 THEN
    -- Menos de 6 meses: 1 dia cada 20 dias trabajados
    v_dias_trabajados := v_fecha_calculo - v_fecha_ingreso;
    v_dias_vacaciones := FLOOR(v_dias_trabajados / 20.0);
  ELSIF v_antiguedad_anios < 5 THEN
    v_dias_vacaciones := 14;
  ELSIF v_antiguedad_anios < 10 THEN
    v_dias_vacaciones := 21;
  ELSIF v_antiguedad_anios < 20 THEN
    v_dias_vacaciones := 28;
  ELSE
    v_dias_vacaciones := 35;
  END IF;
  
  RETURN v_dias_vacaciones;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Nueva Funcion RPC: `recalcular_todos_saldos_vacaciones`

Para actualizar masivamente todos los saldos:

```sql
CREATE OR REPLACE FUNCTION recalcular_todos_saldos_vacaciones(p_anio INTEGER)
RETURNS TABLE (
  empleado_id UUID,
  nombre TEXT,
  apellido TEXT,
  dias_anteriores NUMERIC,
  dias_nuevos NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH calculos AS (
    SELECT 
      e.id,
      e.nombre,
      e.apellido,
      COALESCE(vs.dias_acumulados, 0) as dias_ant,
      calcular_vacaciones_ley_argentina(e.id, p_anio) as dias_new
    FROM empleados e
    LEFT JOIN vacaciones_saldo vs ON vs.empleado_id = e.id AND vs.anio = p_anio
    WHERE e.activo = true AND e.fecha_ingreso IS NOT NULL
  )
  UPDATE vacaciones_saldo SET 
    dias_acumulados = c.dias_new,
    dias_pendientes = c.dias_new - vacaciones_saldo.dias_usados
  FROM calculos c
  WHERE vacaciones_saldo.empleado_id = c.id 
    AND vacaciones_saldo.anio = p_anio
  RETURNING c.id, c.nombre, c.apellido, c.dias_ant, c.dias_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Modificacion de la Pagina de Vacaciones

**Archivo:** `src/pages/Vacaciones.tsx`

Agregar nueva pestania "Calculadora" solo visible para admin:

```tsx
{isAdmin && (
  <TabsTrigger value="calculadora">
    <Calculator className="h-4 w-4 mr-2" />
    Calculadora
  </TabsTrigger>
)}

{isAdmin && (
  <TabsContent value="calculadora" className="space-y-4">
    <CalculadoraVacaciones />
  </TabsContent>
)}
```

---

### Detalles Tecnicos del Componente

#### Estados principales:
```typescript
interface EmpleadoVacaciones {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  fecha_ingreso: string | null;
  antiguedad_anios: number;
  antiguedad_meses: number;
  dias_segun_ley: number;
  dias_en_sistema: number;
  diferencia: number;
}
```

#### Funcionalidades:
1. **Listar empleados con calculo**: Tabla con todos los datos
2. **Destacar discrepancias**: Badge rojo si dias_en_sistema != dias_segun_ley
3. **Alerta sin fecha**: Card de advertencia si hay empleados sin fecha_ingreso
4. **Recalcular individual**: Boton por fila para actualizar un empleado
5. **Recalcular masivo**: Boton para actualizar todos
6. **Exportar Excel**: Generar reporte con detalle

---

### Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/components/vacaciones/CalculadoraVacaciones.tsx` | Crear | Nuevo componente principal |
| `src/pages/Vacaciones.tsx` | Modificar | Agregar pestania "Calculadora" |
| Migracion SQL | Crear | Funciones RPC para calculo LCT |

---

### Resultado Final

Una nueva pestania en el modulo de Vacaciones donde el administrador podra:
1. Ver todos los empleados con sus dias de vacaciones calculados segun ley
2. Identificar rapidamente discrepancias entre lo calculado y lo registrado
3. Recalcular automaticamente los saldos segun la ley argentina
4. Exportar el reporte para auditoria o archivo
