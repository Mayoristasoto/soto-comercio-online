# Recorrido de salón sobre el plano

Nueva sección para controlar la sucursal caminando pasillo por pasillo sobre el plano interactivo: elegís el pasillo, marcás en el mapa el punto exacto del problema y cargás qué encontraste (limpieza, mal roteado, precios, etc.), con foto y comentario.

Queda separada del Checklist de Control actual (después decidís si se unifica).

## Cómo funciona

1. **Definir los pasillos (una vez por sucursal)**
   Sobre el plano que ya tenés cargado de José Martí, dibujás recuadros y les ponés nombre: "Pasillo 1", "Pasillo bebidas", "Fiambrería", "Línea de caja". Se pueden mover, redimensionar, renombrar y ordenar según el recorrido real.

2. **Configurar los criterios**
   Pantalla de configuración donde creás y editás la lista de cosas a controlar: Limpieza, Productos mal roteados, Precios, Faltantes, Exhibición, Vencimientos... Cada criterio puede marcarse como obligatorio y tener un orden.

3. **Hacer el recorrido (pensado para celular)**
   - Elegís sucursal y arrancás un recorrido nuevo (queda en borrador).
   - Ves el plano con los pasillos pintados según su estado: gris sin controlar, verde ok, amarillo con observaciones, rojo con problemas.
   - Tocás un pasillo y aparece la lista de criterios; cada uno se marca Cumple / Parcial / No cumple.
   - Si algo está mal, tocás **"Marcar en el mapa"**: se abre el plano del pasillo, tocás el punto exacto y queda un pin numerado con el criterio, la foto y el comentario.
   - Botones "Siguiente pasillo" / "Anterior" para recorrer sin volver al menú, más un menú colapsable de pasillos para saltar a cualquiera.
   - Al final: resumen con puntaje, cantidad de hallazgos por criterio y cierre del recorrido.

4. **Historial y análisis**
   - Listado de recorridos por sucursal y fecha, con puntaje y hallazgos.
   - Vista de un recorrido cerrado: plano con todos los pines, detalle por pasillo y fotos.
   - Mapa de calor: qué pasillos acumulan más problemas en el último período, y ranking de criterios más incumplidos.
   - Exportación a PDF del recorrido con el plano, los pines y las fotos.

## Alcance de sucursales

Se prepara para varias sucursales desde el arranque: cada plano queda asociado a una sucursal. El plano actual de góndolas se asigna a José Martí y más adelante cargás el de los otros locales sin tocar nada más.

## Permisos

- `admin_rrhh`: configura pasillos y criterios, ve todos los recorridos, fotos e informes.
- `gerente_sucursal`: hace y continúa recorridos de su sucursal y ve su historial, sin editar configuración.

## Detalle técnico

Tablas nuevas (todas con RLS + GRANT):
- `recorrido_planos`: `sucursal_id`, `nombre`, `ancho`, `alto`, `usa_gondolas` (para dibujar el layout de góndolas de fondo), `activo`.
- `recorrido_zonas`: `plano_id`, `nombre`, `orden`, `x`, `y`, `width`, `height`.
- `recorrido_criterios`: `nombre`, `descripcion`, `orden`, `obligatorio`, `activo`.
- `recorridos`: `sucursal_id`, `plano_id`, `fecha_hora`, `responsable_id`, `estado` (borrador/cerrado), `observaciones_generales`, `cerrado_at/por`.
- `recorrido_hallazgos`: `recorrido_id`, `zona_id`, `criterio_id`, `estado` (reusa el enum `checklist_estado_item`), `punto_x`, `punto_y` (nullable), `observaciones`, `orden`.
- `recorrido_hallazgo_fotos`: `hallazgo_id`, `storage_path` (bucket privado `checklist-evidencias` ya existente).

Frontend:
- `src/pages/RecorridoSalon.tsx` — pestañas Recorrer / Historial / Análisis.
- `src/pages/RecorridoConfig.tsx` — editor de pasillos sobre el plano + criterios.
- `src/components/recorrido/PlanoRecorrido.tsx` — canvas SVG con góndolas de fondo (leídas de `gondolas`), zonas coloreadas por estado y captura de coordenadas al tocar.
- `src/components/recorrido/ZonaPanel.tsx`, `HallazgoDialog.tsx`, `ResumenRecorrido.tsx`.
- `src/utils/recorridoPDF.ts` para el informe.
- Rutas `/rrhh/recorrido`, `/rrhh/recorrido/config`, `/rrhh/recorrido/:id`, más acceso desde el sidebar y desde las tarjetas del panel de encargados.

Las coordenadas de los pines se guardan relativas al plano (0-1), así el marcado es igual en celular y escritorio.

## Primera entrega

Plano de José Martí con pasillos editables, criterios configurables, recorrido móvil con pines y fotos, cierre e historial. Mapa de calor y PDF quedan como segundo paso una vez que valides el flujo.
