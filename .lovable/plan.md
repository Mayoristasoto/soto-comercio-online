## Problema

En el PDF de "Liquidación de Horas Extras", la columna **Detalle** se ve como `2 4   m i n  !'  3 0   m i n` en vez de `24 min → 30 min`. Causa: jsPDF usa Helvetica estándar (WinAnsi), que no soporta el carácter `→` (U+2192). Al fallar, autoTable separa cada glifo. La UI web sí lo muestra bien porque ahí es HTML.

## Cambios

### 1. `src/utils/reporteHorasExtrasPDF.ts`

- Reemplazar el separador `→` por `->` (ASCII puro) **solo para el PDF**. Mantener `→` en la UI web.
  - Opción más limpia: agregar una helper `redondeoLabelAscii(j)` que reconstruye el texto usando `->`. Usarla en el `body` de `autoTable`.
- Definir `columnStyles` en la tabla de detalle para que cada columna tenga el ancho correcto y nada quede apretado:
  - Fecha: 18mm, Empleado: 38mm, Sucursal: 22mm, Entrada: 14mm, Salida: 14mm, Base: 10mm, Exceso real: 18mm (right), Pagado: 16mm (right, bold), Detalle: 30mm.
- Ajustar `styles`: `fontSize: 8`, `cellPadding: 1.8`, `overflow: "linebreak"`, `valign: "middle"`.
- Cambiar `headStyles.halign: "left"` para consistencia.
- Alternar color de fila con `alternateRowStyles: { fillColor: [248, 246, 250] }` para mejorar lectura.
- En la fila de domingo (highlight naranja existente), usar un tono más suave: `fillColor: [255, 237, 224]`, `textColor: [180, 60, 10]` para no tapar el texto.

### 2. UI (`ReporteHorasExtras.tsx`)

La tabla web ya muestra bien la flecha, pero está apretada en viewport chico. Mejoras menores:

- Envolver `<Table>` en `<div className="min-w-full overflow-x-auto">` adentro del `ScrollArea` para scroll horizontal limpio.
- Agregar `whitespace-nowrap` a las celdas de Fecha, Entrada, Salida, Base, Exceso real, Pagado y Detalle.
- En filas de domingo, suavizar el color: usar `bg-orange-50 text-orange-900` (tokens) en vez del HSL custom actual, para mejor contraste.
- Agregar separador visual entre header y body (la tabla ya lo tiene por shadcn, confirmar).

## Resultado

- En el PDF, la columna Detalle se lee `24 min -> 30 min`, `19 min -> 30 min`, `12 min -> 0`, sin glifos rotos.
- Columnas con anchos prolijos, alternancia de filas, domingos en naranja suave legible.
- En la UI web, scroll horizontal cuando no entra y filas de domingo más limpias.
