
# Creación manual de llegadas tarde faltantes + reporte actualizado

## Análisis completo de fichajes de febrero 2026

### Carlos Espina (horario: 10:30 ART, tolerancia 1 min)

Cruzando todos sus fichajes de febrero contra los cruces rojas existentes:

| Fecha | Hora ART | Min tarde | Cruce Roja | Acción |
|-------|----------|-----------|------------|--------|
| 02/02 | 10:32 | 2 min | ✅ Registrada (1 min) | Ninguna |
| 03/02 | 10:38 | 8 min | ❌ NO registrada | **CREAR** |
| 04/02 | 10:30 | 0 | OK | Ninguna |
| 05/02 | 10:29 | 0 | OK | Ninguna |
| **06/02** | **12:26** | **116 min** | ❌ **NO registrada** | **CREAR** |
| 07/02 | 07:25 | 0 | OK | Ninguna |
| 09/02 | 10:37 | 7 min | ✅ Registrada (6 min) | Ninguna |
| 10/02 | 10:31 | 1 min | ✅ Registrada (1 min) | Ninguna |
| 11/02 | 10:26 | 0 | OK | Ninguna |
| 12/02 | 10:24 | 0 | OK | Ninguna |
| 13/02 | 10:31 | 1 min | ✅ Registrada (1 min) | Ninguna |
| 14/02 | 07:21 | 0 | OK | Ninguna |
| 17/02 | 07:26 | 0 | OK | Ninguna |
| 18/02 | 12:13 | 103 min | ✅ Registrada (102 min) | Ninguna |
| 19/02 | 10:28 | 0 | OK | Ninguna |
| 20/02 | 10:47 | 17 min | ✅ Registrada (17 min) | Ninguna |

**Faltan 2 cruces rojas:** 03/02 (8 min) y 06/02 (116 min)

### Julio Gomez Navarrete (horario: 07:30 ART, tolerancia 1 min)

Solo se mantiene la del 16/02 (ya hecho). El resto está anulado.

| Fecha | Hora ART | Min tarde | Cruce Roja | Estado |
|-------|----------|-----------|------------|--------|
| 16/02 | 08:04 | 34 min | ✅ Activa | Mantener |
| Resto | - | - | Anuladas | Correcto |

### Analia Del Valle (horario: 07:30 ART, tolerancia 1 min)

Revisando sus fichajes en UTC (07:30 ART = 10:30 UTC):

| Fecha | Hora UTC | Hora ART | Min tarde | Cruce Roja |
|-------|----------|----------|-----------|------------|
| 02/02 | 10:26 | 07:26 | 0 | OK |
| 03/02 | 10:27 | 07:27 | 0 | OK |
| 04/02 | 10:27 | 07:27 | 0 | OK |
| 05/02 | 10:30 | 07:30 | 0 | OK |
| 06/02 | 10:29 | 07:29 | 0 | OK |
| 07/02 | 10:22 | 07:22 | 0 | OK |
| 09/02 | 10:27 | 07:27 | 0 | OK |
| 10/02 | 10:27 | 07:27 | 0 | OK |
| 11/02 | 10:26 | 07:26 | 0 | OK |
| 12/02 | 10:24 | 07:24 | 0 | OK |
| 13/02 | 10:26 | 07:26 | 0 | OK |
| **14/02** | **11:04** | **08:04** | **34 min** | ✅ Registrada |
| 16/02 | 10:23 | 07:23 | 0 | OK |
| 17/02 | 10:23 | 07:23 | 0 | OK |
| 18/02 | 10:26 | 07:26 | 0 | OK |
| 19/02 | 10:29 | 07:29 | 0 | OK |
| 20/02 | 10:29 | 07:29 | 0 | OK |

Analia: todo correcto, solo tiene el 14/02 que ya está registrado.

## Registros a crear en la base de datos

Se insertarán 2 registros en `empleado_cruces_rojas` para Carlos Espina:

**Registro 1 - 03/02/2026:**
- `empleado_id`: 6e1bd507-5956-45cf-97d9-2d07f55c9ccb (Carlos Espina)
- `tipo_infraccion`: llegada_tarde
- `fecha_infraccion`: 2026-02-03
- `minutos_diferencia`: 8
- `observaciones`: "Llegada tarde registrada manualmente: 10:38 a. m. (programado: 10:30, tolerancia: 1 min)"
- `anulada`: false

**Registro 2 - 06/02/2026:**
- `empleado_id`: 6e1bd507-5956-45cf-97d9-2d07f55c9ccb (Carlos Espina)
- `tipo_infraccion`: llegada_tarde
- `fecha_infraccion`: 2026-02-06
- `minutos_diferencia`: 116
- `observaciones`: "Llegada tarde registrada manualmente: 12:26 p. m. (programado: 10:30, tolerancia: 1 min)"
- `anulada`: false

## Resultado esperado del reporte (febrero 2026)

| Gerente | Sucursal | Llegadas tarde | Total min | % días (sobre 20) |
|---------|----------|---------------|-----------|-------------------|
| Carlos Espina | José Martí | 8 | 249 min | 40% |
| Julio Gomez Navarrete | José Martí | 1 | 33 min | 5% |
| Analia Del Valle | Juan B. Justo | 1 | 34 min | 5% |

## Archivos a modificar

Solo se ejecutan inserts en la base de datos (no se modifica ningún archivo de código). El reporte `/reporte-gerentes-tarde` reflejará automáticamente los datos actualizados al hacer clic en "Actualizar".
