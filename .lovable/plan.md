

# Hacer visible la columna "Jornada" en Horarios

## Problema

La columna "Jornada" con el boton "Configurar" esta dentro de la pestana "Gestion de Turnos" (la tercera pestana), pero al entrar a Horarios se abre por defecto la pestana "Ajuste Visual". Por eso no la ves.

## Solucion

Agregar la columna "Jornada" tambien en la pestana principal "Ajuste Visual" (el componente `HorariosDragDrop`), de forma que sea visible apenas entras a Horarios sin tener que cambiar de pestana.

Ademas, agregar una pestana dedicada "Asignacion de Horarios" (la cuarta) que muestre la tabla de asignaciones con la columna Jornada de forma mas prominente, separada de la gestion de turnos.

## Cambios propuestos

| Archivo | Cambio |
|---------|--------|
| `src/components/fichero/FicheroHorarios.tsx` | Cambiar `defaultValue` de las tabs a `"management"` para que abra directamente en la pestana donde esta la tabla de asignaciones con Jornada. Separar la tabla de "Asignacion de Horarios" en su propia pestana para que sea mas facil de encontrar |
| `src/components/fichero/FicheroHorarios.tsx` | Reorganizar las tabs: (1) Asignacion de Horarios (con Jornada visible, como default), (2) Ajuste Visual, (3) Vista Calendario, (4) Gestion de Turnos |

## Detalle tecnico

- Se mueve la seccion "Asignacion de Horarios" (la Card con la tabla que contiene la columna Jornada) a una nueva TabsContent con valor `"assignments"`
- Se cambia `defaultValue="drag-drop"` a `defaultValue="assignments"` para que al entrar a Horarios se vea directamente la tabla con la columna Jornada
- Las tabs quedan: Asignacion (default) | Ajuste Visual | Calendario | Turnos
- No se cambia logica ni base de datos, solo reorganizacion visual
