# Vista móvil guiada para Recorrido de Salón

Objetivo: crear una experiencia móvil limpia, parecida al “Modo control” del Checklist, pero para controlar góndolas sobre el layout del salón.

## Cómo se verá y usará

1. Al abrir un recorrido desde celular, se mostrará una vista guiada a pantalla completa.
2. Arriba habrá una barra simple con:
   - nombre de la sucursal,
   - progreso del recorrido,
   - botón para salir a la vista completa.
3. El primer bloque visible será el plano/layout del salón, optimizado para celular.
4. Al tocar una góndola, esa góndola queda seleccionada y se abre debajo su control.
5. Se califica por criterios con botones grandes:
   - Cumple,
   - Parcial,
   - No cumple.
6. Luego de calificar, se podrá avanzar a otra góndola sugerida, elegir cualquiera desde el plano o abrir un índice de góndolas.
7. No se forzará que la siguiente góndola sea la de al lado: el usuario podrá saltar a cualquier góndola pendiente.
8. La pantalla tendrá un resumen final con góndolas evaluadas, pendientes y porcentaje.
9. Si el recorrido está cerrado, la vista se abrirá en solo lectura.

## Flujo propuesto

```text
Abrir recorrido en celular
        ↓
Ver layout limpio del salón
        ↓
Tocar góndola
        ↓
Calificar criterios
        ↓
Elegir: siguiente pendiente / elegir otra en mapa / ir al resumen
        ↓
Cerrar recorrido
```

## Detalles técnicos

- Crear un componente nuevo para la vista guiada móvil del recorrido.
- Reutilizar la lógica actual de `RecorridoDetalle`: criterios, hallazgos, fotos, historial, estados y guardado.
- Reutilizar `PlanoCanvas` para mostrar el layout, pero en un contenedor móvil más limpio y táctil.
- Mantener la vista actual de escritorio sin cambios.
- Activar automáticamente esta vista en mobile usando el hook móvil existente.
- Agregar un botón “Modo control” en desktop para abrir la misma vista manualmente.
- Mantener la regla actual de color de góndola: prevalece el peor estado.
- Usar los mismos permisos y tablas actuales; no requiere cambios de base de datos.

## Alcance

Incluido:
- layout visible en mobile,
- selección táctil de góndola,
- calificación guiada por criterios,
- avance flexible entre góndolas,
- índice de góndolas pendientes/evaluadas,
- resumen y cierre,
- modo solo lectura si está completado.

No incluido:
- cambios al editor de góndolas,
- cambios en la base de datos,
- sincronización externa,
- cambios en la lógica de colores.
