

## Problem Diagnosis

The kiosk vacation request fails because the `solicitudes_vacaciones` table has RLS policies that require an authenticated Supabase user session (`auth.uid()` via `get_current_empleado()`). The kiosk operates without a full Supabase auth session -- the employee is identified via facial recognition or PIN, not via Supabase login. This causes:

- **406 (Not Acceptable)**: The SELECT query for conflict checking fails because RLS blocks the read.
- **401 (Unauthorized)**: The INSERT to create the vacation request fails because RLS blocks the write.

This is the same architectural challenge solved elsewhere in the kiosk (e.g., attendance, advances) using **RPC functions with `SECURITY DEFINER`**.

## Solution

Create a Supabase RPC function `kiosk_solicitar_vacaciones` that:
1. Accepts `p_empleado_id`, `p_fecha_inicio`, `p_fecha_fin`, `p_motivo` as parameters
2. Runs as `SECURITY DEFINER` to bypass RLS
3. Internally validates: employee exists and is active, dates are valid, no blocking periods, no approved conflicts for same role/branch
4. Inserts the vacation request and returns success/error

Create a second RPC function `kiosk_check_vacaciones_conflictos` for conflict checking that:
1. Accepts `p_empleado_id`, `p_fecha_inicio TEXT`, `p_fecha_fin TEXT`
2. Returns conflict info (approved/pending overlaps in same role+branch)
3. Also `SECURITY DEFINER`

### Files to Create
- SQL migration with both RPC functions

### Files to Modify
- `src/pages/Autogestion.tsx`: Replace direct Supabase table queries with RPC calls for both conflict checking and vacation submission

### Technical Details

**Migration SQL (new file)**:
```sql
CREATE OR REPLACE FUNCTION public.kiosk_solicitar_vacaciones(
  p_empleado_id UUID,
  p_fecha_inicio TEXT,
  p_fecha_fin TEXT,
  p_motivo TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bloqueo RECORD;
  v_conflicto RECORD;
  v_emp RECORD;
BEGIN
  -- Validate employee
  SELECT id, puesto, sucursal_id, activo INTO v_emp
  FROM empleados WHERE id = p_empleado_id;
  IF NOT FOUND OR NOT v_emp.activo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empleado no encontrado o inactivo');
  END IF;

  -- Check blocks
  SELECT motivo INTO v_bloqueo FROM vacaciones_bloqueos
  WHERE activo = true
    AND fecha_inicio <= p_fecha_fin::date
    AND fecha_fin >= p_fecha_inicio::date
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Periodo bloqueado: ' || v_bloqueo.motivo);
  END IF;

  -- Check approved conflicts (same role + branch)
  IF v_emp.puesto IS NOT NULL AND v_emp.sucursal_id IS NOT NULL THEN
    SELECT sv.id INTO v_conflicto FROM solicitudes_vacaciones sv
    JOIN empleados e ON e.id = sv.empleado_id
    WHERE sv.empleado_id != p_empleado_id
      AND sv.estado = 'aprobada'
      AND sv.fecha_inicio <= p_fecha_fin::date
      AND sv.fecha_fin >= p_fecha_inicio::date
      AND e.puesto = v_emp.puesto
      AND e.sucursal_id = v_emp.sucursal_id
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya existe una solicitud aprobada en tu puesto y sucursal para estas fechas');
    END IF;
  END IF;

  -- Insert
  INSERT INTO solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin, motivo, estado)
  VALUES (p_empleado_id, p_fecha_inicio::date, p_fecha_fin::date, p_motivo, 'pendiente');

  RETURN jsonb_build_object('success', true);
END;
$$;
```

**Autogestion.tsx changes**:
- Replace the `solicitarVacaciones` function to call `supabase.rpc('kiosk_solicitar_vacaciones', {...})` instead of direct table insert
- Replace the conflict-checking `useEffect` to call `supabase.rpc('kiosk_check_vacaciones_conflictos', {...})` instead of direct SELECT with join

