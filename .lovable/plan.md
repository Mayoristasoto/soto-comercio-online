
# Reglas de Vacaciones visibles para Admin + Bloqueo ultima semana noviembre para Gerentes

## Resumen

Se realizaran dos cambios:

1. **Panel de reglas visible para admin** en la pagina de Vacaciones: agregar una Card/seccion en la pestaña de Aprobaciones (o como seccion general visible solo para admin) que muestre todas las reglas de vacaciones vigentes.

2. **Nueva regla: bloqueo ultima semana de noviembre para gerentes de sucursal**: los empleados con rol `gerente_sucursal` no podran solicitar vacaciones en la ultima semana de noviembre (24-30 nov aprox).

## Cambios

### 1. `src/components/vacaciones/SolicitudVacaciones.tsx`

**Recibir el rol del empleado como prop:**
- Agregar `rol?: string` a `SolicitudVacacionesProps`
- Modificar `validarReglasVacaciones` para recibir el rol como tercer parametro
- Agregar Regla 3: si el rol es `gerente_sucursal` y las fechas tocan la ultima semana de noviembre (24-30 nov), bloquear con mensaje "Los gerentes de sucursal no pueden solicitar vacaciones en la ultima semana de noviembre."
- Actualizar el bloque informativo de reglas para mostrar la regla de noviembre cuando el rol sea `gerente_sucursal`

**Logica de la nueva regla:**
```typescript
// Regla 3: Ultima semana de noviembre bloqueada para gerentes
if (rol === 'gerente_sucursal') {
  const anio = inicio.getFullYear();
  const novUltimaSemanaInicio = new Date(anio, 10, 24); // 24 nov
  const novUltimaSemanaFin = new Date(anio, 10, 30);    // 30 nov
  const tocaUltimaSemNov = inicio <= novUltimaSemanaFin && fin >= novUltimaSemanaInicio;
  if (tocaUltimaSemNov) {
    return { valid: false, message: "Los gerentes de sucursal no pueden solicitar vacaciones en la ultima semana de noviembre." };
  }
}
```

### 2. `src/components/vacaciones/MisVacaciones.tsx`

- Pasar el `rol` del empleado como prop nueva (agregar `rol?: string` a `MisVacacionesProps`)
- Pasarlo a `SolicitudVacaciones` como prop

### 3. `src/pages/Vacaciones.tsx`

- Pasar `userInfo.rol` a `MisVacaciones` como prop
- Agregar una nueva seccion/Card visible solo para admin (dentro de la pestaña "aprobaciones" o como seccion independiente arriba de los tabs) que muestre un resumen de todas las reglas de vacaciones vigentes:
  - Diciembre bloqueado para todos
  - Receso invernal: solo 1 semana (20/7 - 2/8)
  - Ultima semana de noviembre bloqueada para gerentes
  - Regla de combinacion para 14 dias

Se agregara una Card con icono `Info` y titulo "Reglas de Vacaciones Vigentes" visible solo cuando `isAdmin === true`, ubicada entre el header y los tabs.

## Detalle tecnico

**Flujo de props:**
- `Vacaciones.tsx` pasa `rol={userInfo.rol}` a `MisVacaciones`
- `MisVacaciones` pasa `rol` a `SolicitudVacaciones`
- `SolicitudVacaciones` pasa `rol` a `validarReglasVacaciones(inicio, fin, rol)`

**Archivos modificados:**
1. `src/components/vacaciones/SolicitudVacaciones.tsx` - nueva regla + prop rol
2. `src/components/vacaciones/MisVacaciones.tsx` - pasar prop rol
3. `src/pages/Vacaciones.tsx` - Card de reglas para admin + pasar prop rol
