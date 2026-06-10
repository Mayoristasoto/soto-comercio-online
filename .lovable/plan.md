## Objetivo

Permitir editar el **DNI** desde el perfil del empleado (Nómina → abrir empleado → pestaña **Personal**), para que luego el sistema de PIN (que usa los últimos 4 dígitos del DNI) funcione correctamente sin tener que recrear al empleado.

## Dónde se agrega

En `src/components/admin/EmployeeProfile.tsx`, pestaña **Personal**, dentro de la tarjeta **Información Personal**, debajo de Nombre / Apellido.

```text
[ Nombre * ]        [ Apellido * ]
[ DNI       ]        [ Teléfono   ]   ← DNI nuevo
[ Fecha Nac.]        [ Estado Civil ]
```

## Comportamiento

1. **Carga:** al abrir el perfil, leer el DNI actual desde `empleados.dni` (ya está en el objeto `empleado`) y mostrarlo en el input.
2. **Validación:** solo números, 7 a 9 dígitos. Campo opcional (se permite vacío para no romper empleados existentes).
3. **Guardar:** al hacer clic en **Guardar**, escribir el DNI en **dos lugares** para mantener consistencia con el resto del sistema:
   - `empleados.dni` (lo usa el listado y el PIN)
   - `empleados_datos_sensibles.dni` (lo usa el reporte de datos incompletos)
4. **Permisos:** el campo se muestra siempre, pero la escritura a `empleados_datos_sensibles` queda condicionada a `isAdmin` (igual que el resto de datos sensibles).
5. **Feedback:** si el DNI cambió, mostrar en el toast de éxito un aviso recordando que el PIN por defecto será **los últimos 4 dígitos del nuevo DNI** y que conviene re-blanquear el PIN desde la pantalla de Gestión de PINs si se desea aplicar el cambio.

## Archivos a modificar

- `src/components/admin/EmployeeProfile.tsx`
  - Agregar `dni` al `formData` inicial y al `useEffect` que carga datos del empleado.
  - Agregar el `<Input>` de DNI en la sección **Información Personal**.
  - Incluir `dni` en el `empleadoUpdate` y en el `sensitiveUpdate` dentro de `handleSave`.
  - Validación simple en `onChange` (solo dígitos).

## Fuera de alcance

- No se modifica el formulario de creación de empleado (ya tiene DNI).
- No se cambia la lógica de PIN ni la RPC `blanquear_pins_con_dni`.
- No se agrega el campo en `EmployeeManagement` / edición rápida (solo en el perfil completo, como pidió el usuario).
