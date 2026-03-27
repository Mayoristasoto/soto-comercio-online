

## Plan: Actualizar datos de empleados desde Excel

### Datos del Excel (25 empleados)
El archivo contiene: Apellido, Nombre, DNI, CUIL, Legajo, Género, Fecha Nacimiento, Domicilio, Celular.

### Mapeo por DNI — Preview de cambios

A continuación el detalle de lo que se actualizaría para cada empleado. Solo se muestran campos que **cambian o se agregan** (los que están vacíos en la BD):

| Empleado | CUIL (nuevo) | Celular (nuevo) | Dirección (nueva) | F.Nacimiento (nueva) | Nombre corregido | Legajo |
|---|---|---|---|---|---|---|
| Aragon, Marina Ailin | 23411280454 | 2236006364 | ANGELELLI 1443 | 1998-04-09 | — | — |
| Bartolo Loyola, Washintong | 20940995117 | 2235905254 | FELIPE DE ARANA 5858 | 1961-10-23 | — | — |
| Carrion, Carla Lorena | 27363637448 | 2236035307 | HEGUILOR 946 | 1991-05-28 | — | — |
| Castagnari, Maria Belen | 27303953375 | 2235281772 | 3 DE FEBRERO 8736 | 1983-07-17 | — | — |
| Chumpitaz Bartolo, Joseph | 20470558432 | 2234481125 | FELIPE DE ARANA 5858 | 2005-07-28 | — | — |
| Conforti, Ricardo Daniel | 20282000106 | 2235925253 | CERRITO 1763 | 1980-05-03 | — | — |
| Del Valle, Analia | 27310185707 | 2235969844 | REFORMA UNIVERSITARIA 320 | 1984-08-10 | "Analia Victoria" | — |
| Diaz, Tomás Javier | 20422825704 | ✅ ya tiene | ✅ ya tiene | ✅ ya tiene | — | — |
| Espina, Carlos | 23238877059 | 2235305208 | MIAMI 238 - SANTA CLARA | 1974-03-18 | "Carlos Adrián" | — |
| Fernandez, Dario Alejandro | 23353365339 | 2236771965 | CHACABUCO 6876 | 1989-04-24 | — | — |
| Galaz, Agustina Lucia | 27420443000 | 2235017919 | GASCON 2709 1ºB | 1999-09-05 | "Agustina Lucía" | cambiar 6→36 |
| Galeote, Mariano Matías | 20382562985 | 2236687121 | ALVARADO 3969 | 1994-01-17 | — | — |
| Gomez Navarrete, Julio | 20267692212 | 1164018220 | SAN LORENZO 4255 | 1978-11-06 | "Julio Cesar" | — |
| Justiniano, Gonzalo | 20340583818 | ✅ ya tiene | DORREGO 1257 | ✅ ya tiene | — | cambiar 37→36 |
| Lan, Laura Lorena | 27229162301 | 2236921510 | SAN SALVADOR 4264 | 1973-03-18 | — | — |
| Merino, Matias Esteban | 23359579969 | 2236698658 | DON ORIONE 2524 | 1991-04-21 | — | — |
| Romero, Jesica Anahí | 27318212312 | 2921496879 | NAPOLES 4446 | 1985-10-04 | — | — |
| Soto, Hugo Carlos | — | 2236823743 | PUAN 4546 | 1950-12-19 | — | — |
| Soto, María Carolina | — | 2236159781 | PUAN 4546 | 1977-04-10 | — | — |
| Tedesco, Noelia Alejandra | 27363836351 | 2236030735 | JURAMENTO 752 | 1991-09-07 | — | — |
| Vera, Jonathan Jesus | 20411280978 | 2234360227 | ECHEVERRIA 1480 | 1998-03-23 | — | — |
| Voikli, Andrés Nicolás | 20231330136 | — | 9 DE JULIO BIS 10341 | ✅ ya tiene | — | cambiar 38→52 |

**No encontrados en el Excel** (no se tocan): Figueroa Agustina Guadalupe, Rincon Patricio Aramis, Juan Cruz Soto, Juan Ignacio Soto.

**No encontrado en la BD**: Figueroa y Rincon sí están en la BD pero el Excel los incluye — se actualizarán también.

### Operaciones (3 tablas)

**1. `empleados` (tabla principal)** — via insert tool:
- UPDATE `cuil` para 22 empleados
- UPDATE `nombre` para 4 empleados (Del Valle, Espina, Galaz, Gomez Navarrete)
- UPDATE `legajo` para 3 empleados (Galaz: 36, Justiniano: 36, Voikli: 52)

**2. `empleados_datos_sensibles`** — via RPC `admin_update_sensitive_data`:
- UPDATE `telefono`, `direccion`, `fecha_nacimiento` para ~22 empleados
- Diaz ya tiene datos completos, se verifica y salta

### Ejecución
Se ejecutará un script que hace UPDATEs individuales por DNI usando el insert tool para `empleados` y el RPC para datos sensibles. Sin cambios de esquema.

### Empleados adicionales del Excel no en BD
- Figueroa Agustina Guadalupe (DNI 45291680) — **sí está** en la BD, se actualiza
- Rincon Patricio Aramis (DNI 38685296) — **no encontrado** en la BD, se puede crear o saltar

### Archivos modificados
Ninguno. Solo datos en BD.

