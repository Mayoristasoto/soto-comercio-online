# Control de insumos: carga única e irreversible para gerentes

El gerente de sucursal carga los números una sola vez y quedan fijos. No hay estado "abierto" editable para él.

## Reglas nuevas

1. El gerente entra, elige sucursal y fecha, y carga cantidades, estado, reposición y observaciones.
2. Hay un único botón: **Finalizar control**. Al confirmarlo se guardan los datos y el control queda cerrado en el mismo paso.
3. Después de finalizar, todo queda solo lectura: no puede corregir números, ni guardar de nuevo, ni abrir un control nuevo para esa sucursal y fecha.
4. Si abandona la página con datos cargados sin finalizar, el control se cierra igual con lo que haya cargado, para que nada quede editable después.
5. Solo RRHH puede reabrir un control cerrado y corregir. El gerente no ve esa opción y la base de datos rechaza el intento.
6. Cada carga y cierre sigue quedando registrado en el historial con aviso a RRHH.

RRHH (admin_rrhh) mantiene el comportamiento actual: puede guardar en varias pasadas, reabrir y crear controles adicionales.

## Detalle técnico

- `src/pages/ControlInsumos.tsx`
  - Nuevo flag `esGerente` (rol `gerente_sucursal` sin `admin_rrhh`).
  - Para gerente: se oculta "Guardar", "Nuevo control" y "Reabrir"; se muestra "Finalizar control" con diálogo de confirmación que ejecuta `guardar()` y luego `rpc insumos_cerrar_control` en secuencia.
  - Si `cerrado === true` y `esGerente`: inputs deshabilitados, banner "Control finalizado — solo RRHH puede reabrirlo", sin acciones.
  - Al cargar la página, si ya existe un control cerrado para esa sucursal/fecha, el gerente ve solo lectura y no se crea un `control_nro` nuevo (el botón "Nuevo control" queda restringido a admin).
  - Cierre al salir: `beforeunload` + cleanup del efecto de ruta; si hay cambios sin finalizar, se dispara el cierre con los datos ya guardados.
- Base de datos: `insumos_cerrar_control` e `insumos_reabrir_control` ya aplican la restricción de rol; no se requieren cambios de esquema.
