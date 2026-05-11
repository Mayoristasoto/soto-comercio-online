## Objetivo
Cargar 9 solicitudes de vacaciones 2026 como **pendientes** y hacerlas visibles en el calendario con color único por empleado y un indicador claro de que aún no están aprobadas.

## Solicitudes a cargar (estado: pendiente, año 2026)

| Empleado | Período | Observación |
|---|---|---|
| Laura Lorena Lan | 11–17 May | — |
| Joseph Daniel Chumpitaz | 15–28 Jun | — |
| Joseph Daniel Chumpitaz | 20–26 Jul | "Daniel" |
| Julio Cesar Gomez Navarrete | 27 Jul – 02 Ago | — |
| Joseph Daniel Chumpitaz | 17–23 Ago | "Daniel" |
| Jonathan Jesus Vera | 7–20 Sep | — |
| Jesica Anahí Romero | 21 Sep – 4 Oct | — |
| Julio Cesar Gomez Navarrete | 9–15 Nov | Posibilidad de pasarla a enero |
| Laura Lorena Lan | 7–13 Dic | — |

Insert en `solicitudes_vacaciones` con `estado='pendiente'`, `motivo` con la observación cuando exista.

## Cambios en el calendario (`CalendarioVacaciones.tsx`)

1. Incluir también `'pendiente'` en el `.in('estado', [...])` del query (hoy solo trae `aprobada` y `gozadas`).
2. Renderizado por empleado/día:
   - **Aprobada/gozada**: pinta con el color del empleado (como hoy, opacidad full).
   - **Pendiente**: mismo color del empleado pero con `opacity-50` + clase `italic`, y badge pequeño "Pendiente" (variant `outline`, ícono `Clock`) al lado del nombre.
3. Leyenda al pie del calendario explicando "Pendiente de aprobación" vs "Aprobada".

## Aprobación una a una
La pestaña **Aprobaciones** ya existe (`AprobacionVacaciones.tsx`) y lista solicitudes con `estado='pendiente'` con botones Aprobar/Rechazar individuales. Se reutiliza tal cual — al cargarse las 9 solicitudes aparecerán automáticamente para que el admin/gerente las apruebe de a una.

## Detalles técnicos

- Insertar las 9 filas vía herramienta de inserción de datos (no migración) en `solicitudes_vacaciones` con `empleado_id`, `fecha_inicio`, `fecha_fin`, `estado='pendiente'`, `motivo`.
- IDs de empleados:
  - Laura Lan: `dc830459-0aa7-4bbe-99f2-9f1080a60b3e`
  - Joseph Chumpitaz: `54278134-59d7-4ac8-abd1-6bc906e871b3`
  - Julio Gomez Navarrete: `1607f6ba-046c-466d-8b4d-acc18e2acfa4`
  - Jonathan Vera: `5d23025c-613f-4774-8e63-f5c80a0acaa3`
  - Jesica Romero: `0da05020-7cb1-42f5-a8cd-02ffaff0f512`
- En el calendario, cambio mínimo localizado al `.in(...)` y al bloque que renderiza cada chip de empleado dentro de `dia.empleados.map(...)`.
