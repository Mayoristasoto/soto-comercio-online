

## Plan: Sistema de Novedades/Alertas en Check-in

### 1. Nueva tabla en Supabase: `novedades_alertas`

```sql
CREATE TABLE public.novedades_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  asignacion_tipo TEXT NOT NULL DEFAULT 'todos', -- 'todos', 'roles', 'empleados'
  roles_asignados TEXT[] DEFAULT '{}', -- e.g. {'cajero','repositor','encargado'}
  empleados_asignados UUID[] DEFAULT '{}',
  imprimible BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para trackear qué empleado ya vio qué novedad hoy
CREATE TABLE public.novedades_vistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novedad_id UUID REFERENCES public.novedades_alertas(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_vista DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(novedad_id, empleado_id, fecha_vista)
);

-- RPC para kiosco (SECURITY DEFINER, sin RLS)
CREATE OR REPLACE FUNCTION public.kiosk_get_novedades(p_empleado_id UUID)
RETURNS TABLE(id UUID, titulo TEXT, contenido TEXT, imprimible BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.titulo, n.contenido, n.imprimible
  FROM novedades_alertas n
  WHERE n.activa = true
    AND now() BETWEEN n.fecha_inicio AND n.fecha_fin
    AND (
      n.asignacion_tipo = 'todos'
      OR (n.asignacion_tipo = 'roles' AND EXISTS (
        SELECT 1 FROM empleados e WHERE e.id = p_empleado_id AND e.puesto = ANY(n.roles_asignados)
      ))
      OR (n.asignacion_tipo = 'empleados' AND p_empleado_id = ANY(n.empleados_asignados))
    )
    AND NOT EXISTS (
      SELECT 1 FROM novedades_vistas v 
      WHERE v.novedad_id = n.id AND v.empleado_id = p_empleado_id AND v.fecha_vista = CURRENT_DATE
    );
END;
$$;

-- RPC para marcar como vista
CREATE OR REPLACE FUNCTION public.kiosk_marcar_novedad_vista(p_novedad_id UUID, p_empleado_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO novedades_vistas (novedad_id, empleado_id, fecha_vista)
  VALUES (p_novedad_id, p_empleado_id, CURRENT_DATE)
  ON CONFLICT DO NOTHING;
END;
$$;
```

RLS: enable on both tables, allow authenticated users with admin role to manage `novedades_alertas`.

### 2. New page: `src/pages/NovedadesAlert.tsx`

Admin CRUD page with:
- List of existing novedades (title, dates, status, assignment)
- Create/edit form with: titulo, contenido, fecha_inicio, fecha_fin, imprimible toggle
- Assignment selector: radio group (Todos / Por Rol / Por Empleado)
  - "Por Rol": multi-select dropdown with roles (cajero, repositor, encargado, gerente_sucursal, etc.)
  - "Por Empleado": searchable employee dropdown
- Toggle activa/inactiva
- Delete button

### 3. New alert component: `src/components/kiosko/NovedadesCheckInAlert.tsx`

Full-screen modal (same pattern as `LlegadaTardeAlert`):
- Shows all pending novedades for the employee
- Displays title + content for each
- Print button if `imprimible = true`
- Auto-dismiss countdown (configurable, default 10s)
- Marks each novedad as viewed via RPC

### 4. Integration in `KioscoCheckIn.tsx`

After successful check-in (around line 831), before showing tareas alert:
- Call `kiosk_get_novedades(empleadoId)` 
- If results exist, show `NovedadesCheckInAlert` first
- After dismissal, continue to tareas alert flow

### 5. Route + Sidebar

- Add route `operaciones/novedades-alertas` in `App.tsx` pointing to new page
- Add "Novedades Alert" item in `AdminSidebar.tsx` under "Operaciones" group

### Files to create
- `src/pages/NovedadesAlert.tsx`
- `src/components/kiosko/NovedadesCheckInAlert.tsx`

### Files to modify
- `src/pages/KioscoCheckIn.tsx` (add novedades check after fichaje)
- `src/components/admin/AdminSidebar.tsx` (add sidebar link)
- `src/App.tsx` (add route)
- Migration SQL (new tables + RPCs)

