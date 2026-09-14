# Cargar todas las góndolas del plano y renumerarlas

Entendido: en el plano de José Martí, cada recuadro verde con el bloque de color adentro es **una góndola** y hay que tenerlas todas cargadas como espacio de control en el mapa v2. Hoy el mapa tiene 19 góndolas cargadas (algunas numeradas 15, 69, 70, 71, 73, 74, 75, 85, 86, 87 y otras nueve sin número real, con nombre provisorio G11–G19), más 15 punteras, 9 exhibidores y 5 carteles.

## Qué se hace

1. **Completar las góndolas faltantes**
   Se cargan los recuadros que faltan tomando como molde los que ya existen: mismo ancho, alto y separación que las góndolas de las filas centrales, respetando las cuatro filas del bloque izquierdo y las dos filas del bloque del medio, tal como se ven en el plano. Las que hoy están con nombre provisorio (G11–G19) se reubican para que coincidan con un recuadro real del plano, así no quedan duplicadas ni sueltas.

2. **Renumerar todo consecutivo**
   Con el botón "Renumerar espacios" del mapa se recorren las góndolas de arriba hacia abajo y de izquierda a derecha y se les asigna número consecutivo desde 1. Antes de guardar se muestra la vista previa antes/después para que la confirmes. Las punteras, exhibidores y carteles se renumeran por separado, cada tipo con su propia serie.

3. **Ajuste fino a mano**
   Después de la carga, cualquier recuadro que haya quedado corrido lo movés o redimensionás arrastrándolo en el editor de espacios; también podés duplicar o borrar.

4. **Generar los controles del recorrido**
   Con el mapa completo, "Empezar de cero con las góndolas" crea un punto de control por cada recuadro, con su tipo, y al pararte sobre una góndola en el recorrido te muestra los criterios que corresponden a ese tipo para marcar Cumple / Parcial / No cumple con observación y foto.

## Nota

El plano de referencia es una imagen, así que las posiciones se calculan por grilla a partir de las góndolas ya cargadas, no midiendo píxel por píxel la foto. Es normal que un par de recuadros queden unos milímetros corridos; se corrigen arrastrando en el editor.

## Detalle técnico

- Todo se escribe únicamente en `gondolas_v2`; el editor original y sus tablas quedan intactos.
- Alta de los recuadros faltantes vía `INSERT` en `gondolas_v2` (`id` `g<N>`, `type='gondola'`, `section`, `status='available'`, `position_x/y/width/height`), derivando la grilla de las filas existentes (w=39, h=17, paso ~40px en x y ~27px en y para las filas centrales).
- Reposicionamiento de `g11`–`g19` con `UPDATE` sobre sus coordenadas para alinearlas a la grilla.
- Renumeración con la utilidad ya existente del `EspaciosEditor` (orden por bandas de `position_y`, luego `position_x`), update en lote de `section` por tipo, con diálogo de vista previa.
- Los puntos del recorrido se regeneran con `empezarDeCeroConGondolas` en `RecorridoSalon.tsx`, guardando `tipo_espacio`; los hallazgos históricos no se borran.
