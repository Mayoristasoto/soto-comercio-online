# Mapa completo de espacios y criterios por tipo

Objetivo: dejar el plano de Martí con **todos** los recuadros cargados (hoy hay 41 y faltan varios, como el de arriba del 71), poder renumerarlos consecutivamente, y que al tocar un recuadro en el recorrido aparezcan los criterios que correspondan a su tipo.

## 1. Completar el mapa

En "Plano y zonas" se agrega un editor de espacios sobre el mismo plano, con dos formas de trabajar:

- **Dibujar**: arrastrás sobre el plano y se crea un recuadro nuevo. Elegís el tipo (góndola, puntera, exhibidor, cartel) y el nombre.
- **Generar en bloque**: seleccionás un recuadro existente como modelo e indicás cuántos repetir y en qué dirección (a la derecha, abajo, etc.). Se crean con el mismo tamaño y separación que el modelo.

Además: mover/redimensionar arrastrando, duplicar y eliminar un recuadro.

## 2. Renumerar todo

Botón "Renumerar espacios": recorre los recuadros en el orden que elijas (de arriba a abajo y de izquierda a derecha, o por pasillo) y les asigna números consecutivos desde el que indiques. Muestra una vista previa antes/después y recién ahí confirmás. La numeración se puede hacer por tipo (góndolas 1..n, punteras 1..n) o toda junta.

## 3. Criterios según el tipo

- Cada criterio pasa a tener los tipos donde aplica (góndola / puntera / exhibidor / cartel). Se configura en la pestaña "Criterios" con casillas por tipo.
- En el recorrido, al tocar un recuadro se abre su panel y sólo se listan los criterios de su tipo, para marcar Cumple / Parcial / No cumple, con observación y foto.
- Los criterios que hoy existen (Limpieza, Precios, Productos mal rotados, Faltantes) quedan aplicados a todos los tipos, así nada se pierde.
- La vista "Ver todas las góndolas" y el botón "Todo cumple" siguen funcionando, respetando los criterios de cada tipo.

## 4. Regenerar el recorrido desde el mapa

"Empezar de cero con las góndolas" pasa a incluir todos los espacios del mapa (no sólo las góndolas), creando un punto de control por cada recuadro, sin borrar los hallazgos históricos.

## Detalle técnico

- Los recuadros viven en `gondolas_v2` (copia independiente; el editor original y sus tablas no se tocan). El editor de espacios escribe `type`, `section`, `status`, `position_x/y/width/height`.
- Nuevo componente `src/components/recorrido/EspaciosEditor.tsx`: dibujo por drag sobre el SVG de `FondoGondolasV2`, repetición en bloque, drag/resize y borrado. Se monta en la pestaña "Plano y zonas" de `RecorridoSalon.tsx`.
- Renumeración: utilidad `renumerarEspacios` (orden por `position_y` en bandas y luego `position_x`), vista previa en diálogo y update en lote de `section`.
- Migración: agregar `tipos_aplica text[] default '{gondola,puntera,exhibidor_impulso,cartel_exterior}'` a `recorrido_criterios`; los criterios existentes quedan con todos los tipos. Guardar `tipo_espacio` en `recorrido_puntos` para filtrar criterios sin releer el layout.
- `RecorridoDetalle.tsx`: filtra criterios por `tipo_espacio` del punto seleccionado; `RecorridoSalon.tsx` (pestaña Criterios) suma las casillas de tipo.
- `empezarDeCeroConGondolas` deja de filtrar por tipo y guarda `tipo_espacio` en cada punto.
