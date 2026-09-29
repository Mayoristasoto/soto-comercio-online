# Recorrido simple: "Reportar algo" para personal de apoyo

## Idea

Una pantalla mínima para que una persona que nos ayuda (logueada con su usuario) pueda sacar fotos de cosas que detecta en el salón, con un comentario opcional. Sin plano, sin criterios, sin calificaciones. Nada de la complejidad del Recorrido de Salón actual.

## Boceto

```text
┌─────────────────────────────┐
│  📷 Reportar algo           │
│  Sucursal: [José Martí ▾]   │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   [ Tomar foto ]      │  │
│  │   [ Elegir de galería]│  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Comentario (opcional)      │
│  ┌───────────────────────┐  │
│  │ Ej: heladera 2 sin    │  │
│  │ precios...            │  │
│  └───────────────────────┘  │
│                             │
│  [    Enviar reporte    ]   │
│                             │
│  ── Mis reportes de hoy ──  │
│  🖼 14:02 "faltante gónd.3" │
│  🖼 13:40 sin comentario    │
└─────────────────────────────┘
```

- Pantalla única, pensada para celular.
- Botones grandes: tomar foto (cámara) o subir de galería.
- Comentario opcional, no obligatorio.
- Abajo ve solo SUS reportes del día (foto, hora, comentario). Puede borrar uno si se equivocó.
- No ve el plano, ni criterios, ni reportes de otros, ni nada más del sistema.

## Qué ve RRHH

- Los reportes aparecen dentro del Recorrido de Salón actual, en la lista de hallazgos abiertos, marcados como "Reporte rápido" con el nombre de quien lo subió, la foto y el comentario.
- RRHH puede revisarlos, convertirlos en tarea si hace falta y marcarlos como resueltos (igual que los hallazgos de hoy).

## Detalles técnicos

- Nueva página `/reporte-rapido` con componente `ReporteRapido.tsx`.
- Se guarda como un hallazgo en `recorrido_hallazgos` con un estado/tipo "reporte_rapido" (sin criterio ni góndola asociada) y las fotos en `recorrido_hallazgo_fotos`, reutilizando el bucket `checklist-evidencias` y la compresión de imágenes que ya existe en `HallazgoFotos`.
- Acceso: se habilita la página para el rol `empleado` (o el rol que tenga la persona) desde la matriz de accesos que ya existe; el resto del menú se le puede ocultar con esa misma herramienta.
- RLS: política para que el usuario solo inserte y vea sus propios reportes; RRHH ve todos.
- No se toca nada del recorrido completo, del editor de góndolas ni del modo guiado.

## Alcance

Incluido:
- pantalla de reporte con foto + comentario opcional,
- lista de "mis reportes de hoy" con borrado,
- visualización para RRHH dentro de hallazgos,
- permiso por rol usando la matriz de accesos existente.

No incluido:
- plano, criterios, calificaciones, tareas automáticas,
- notificaciones push,
- cambios en módulos existentes.
