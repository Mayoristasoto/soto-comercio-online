## Objetivo

Generar un único archivo PDF descargable (`entregas_pantalon_cargo.pdf`) con **13 páginas**, una por empleado, usando la plantilla HTML existente "Pantalon" (`plantillas_elementos.id = d9d1255d-...`).

## Datos por empleado (orden y talle)

| # | Empleado | Talle |
|---|---|---|
| 1 | Marina | 40 |
| 2 | Uriel | 40 |
| 3 | Juan | 40 |
| 4 | Carlos | 42 |
| 5 | Daniel | 42 |
| 6 | Josep | 42 |
| 7 | Julio | 44 |
| 8 | Analia | 46 |
| 9 | Jony | 46 |
| 10 | Carla | 48 |
| 11 | Belen | 56 |
| 12 | Washintong | 56 |
| 13 | Laura | 60 |

## Reemplazos en la plantilla

- `{{empleado_nombre}}` → nombre tal cual (ej. "Marina")
- `{{detalle}}` → `Pantalón Cargo Negro SAG Talle {{talle}}` (ej. "Pantalón Cargo Negro SAG Talle 40")
- `{{item}}` → "Pantalón Cargo Negro SAG"
- `{{fecha}}` → 30/06/2026
- `{{legajo}}`, `{{observaciones}}` → vacío

## Cómo se genera (técnico)

1. Descargar `template_html` desde `plantillas_elementos`.
2. Por cada empleado, hacer `replaceAll` de los placeholders.
3. Concatenar las 13 secciones con `page-break-after: always` en un solo HTML.
4. Renderizar a PDF con Chromium headless (Playwright) en A4.
5. Guardar en `/mnt/documents/entregas_pantalon_cargo.pdf` y entregarlo como artifact.

No se modifica código del proyecto ni base de datos.
