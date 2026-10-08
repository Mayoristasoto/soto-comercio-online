# Configurar el menú de Autogestión del kiosco

## Estado actual
- Las 6 tarjetas del menú son fijas y no se pueden configurar: Mis Tareas, Solicitar Adelanto, Consultar Saldo, Solicitar Vacaciones, Mis pedidos y Hablar con RRHH. No hay forma de ocultarlas, cambiarles el orden ni editar sus textos.
- Ya hay reglas para **adelantos**: un monto máximo por mes (hoy $50.000) y 3 días de anticipación. Se manejan en Solicitudes → Configuración, pero esa pantalla queda aparte del kiosco.
- Las **vacaciones** ya tienen sus bloqueos (diciembre, receso invernal) y el control de superposición por puesto y sucursal.

## Qué se construye
Una pantalla nueva **Configuración → Autogestión del kiosco**, solo para Admin RRHH. Muestra una fila por cada tarjeta, con estas opciones:
- **Activa o no:** si está apagada, la tarjeta desaparece del kiosco.
- **Orden:** flechas para subir o bajar la tarjeta.
- **Textos:** título y descripción editables. Ejemplo: "Solicitar Adelanto" / "Pedí un adelanto de sueldo".
- **Quién la ve:** todos, o solo ciertas sucursales o puestos. Por ejemplo, "Consultar Saldo" solo para quienes tienen cuenta en Centum.
- **Reglas propias de cada tarjeta:**
  - Adelanto: monto máximo por mes, días de anticipación y si se muestra el saldo disponible. Usa las mismas reglas de Solicitudes, sin duplicarlas.
  - Vacaciones: días mínimos de anticipación y un enlace a los bloqueos existentes.
  - Hablar con RRHH: activar o desactivar la reserva de horarios.
  - Mis Tareas: si se permite imprimir.
- **Vista previa** del menú tal como lo va a ver el empleado.
- Botón **"Restablecer valores por defecto"**.

Si no hay nada configurado, el kiosco se ve igual que hoy.

## Detalles técnicos
- Tabla nueva `autogestion_secciones` con estos campos: clave (tareas / adelanto / saldo / vacaciones / pedidos / charla), activo, orden, titulo, descripcion, sucursales_ids[], puestos_ids[], opciones jsonb y updated_at.
  - Permisos: GRANT para authenticated y service_role. Con RLS, cualquiera puede leer y solo admin_rrhh (`has_role`/`is_admin_rrhh`) puede escribir.
  - Se cargan las 6 filas por defecto.
- Como el kiosco funciona sin sesión, se agrega el RPC `kiosk_get_autogestion_secciones(p_empleado_id uuid)` con SECURITY DEFINER. Devuelve solo las secciones visibles para ese empleado según su sucursal y su puesto.
- `src/pages/Autogestion.tsx`: el menú se arma desde ese RPC en lugar de las tarjetas fijas. Mantiene un respaldo con el menú actual si el RPC falla.
- Componente nuevo `src/components/admin/ConfigAutogestion.tsx`, como pestaña nueva en `/admin/configuracion`. Las reglas de adelanto leen y escriben en `solicitudes_configuracion` (tipo `adelanto_sueldo`).
