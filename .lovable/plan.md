# Checklist de Control: modo móvil guiado

Objetivo: hacer el control desde celular/tablet con una vista limpia, un ítem por pantalla y avance visible, sin perder la vista actual de escritorio.

## Cómo se verá y usará

1. Al abrir un control en pantalla chica (o al tocar "Modo control" en cualquier pantalla), se entra en un **modo guiado a pantalla completa**:
   - **Barra superior fija**: nombre de sucursal, sección actual, progreso "12 / 35" y barra de avance. Botón X para salir al detalle completo.
   - **Cuerpo**: un solo ítem grande y legible, con el texto del ítem y su sección.
   - **Tres botones grandes** apilados a lo ancho: Cumple (verde), Cumple Parcial (amarillo), No Cumple (rojo). Al tocar uno se guarda y avanza automáticamente al siguiente ítem (breve confirmación visual).
   - **Observaciones** y **fotos** colapsadas por defecto: dos botones tipo chip ("Observación", "Foto") que se abren solo si hacen falta; si ya hay contenido muestran contador (ej. "Foto 2"). Al elegir Parcial o No Cumple, el campo de observación se abre solo.
   - Cámara directa desde el móvil para la evidencia.
2. **Barra inferior fija**: Anterior / Siguiente, y "Saltar" para dejar el ítem sin evaluar y volver luego.
3. **Navegación por secciones**: al terminar una sección, pantalla intermedia con el resumen de esa sección (cumple / parcial / no cumple) y botón "Continuar con {siguiente sección}". Un botón de índice permite ver la lista de secciones con su avance y saltar a cualquiera.
4. **Pantalla final de cierre**: resumen general con porcentaje de cumplimiento, contadores, lista de ítems sin evaluar (tocables para completarlos), campo de observaciones generales y botón "Cerrar control" (deshabilitado si quedan ítems sin evaluar, con aviso claro).
5. **Control cerrado**: el modo guiado se abre en solo lectura, con estados, observaciones y fotos visibles pero sin botones de edición.
6. **Historial en móvil**: la lista de controles pasa a tarjetas apiladas (sucursal, fecha, estado, % cumplimiento) en vez de tabla, y el botón "Nuevo control" queda fijo abajo a la derecha.

## Detalles técnicos

- Nuevo componente `src/components/checklist/ChecklistModoGuiado.tsx`: recibe items, fotos, readOnly y los mismos callbacks que ya usa `ChecklistControlDetalle` (`actualizarItem`, `recargarFotos`, `cambiarEstado`, observaciones generales). Sin lógica de datos nueva: reutiliza las mutaciones existentes de la página.
- Subcomponentes: `GuiadoHeader` (progreso + secciones), `GuiadoItemCard` (ítem + estados + chips de observación/foto), `GuiadoSeccionResumen`, `GuiadoCierre`.
- `src/pages/ChecklistControlDetalle.tsx`: agrega estado `modoGuiado`; se activa por defecto cuando `useIsMobile()` (hook existente `src/hooks/use-mobile.tsx`) es true, y un botón "Modo control" lo activa manualmente en desktop. La vista actual queda intacta como fallback/escritorio.
- Reutilizar `EvidenciaUploader` (con `capture="environment"` en el input de archivo para abrir cámara) y `resumirItems` de `checklistTypes.ts`; los colores siguen usando `ESTADO_CLASSES` / `ESTADO_SOFT_CLASSES` (tokens semánticos, sin colores hardcodeados).
- Áreas táctiles mínimo 44px, contenedor `min-h-[100dvh]` con header/footer `sticky` para evitar saltos con el teclado en iOS.
- `src/pages/ChecklistControles.tsx`: render condicional tarjetas (móvil) / tabla (desktop) y botón flotante de nuevo control en móvil.
- Sin cambios de base de datos ni de permisos.
