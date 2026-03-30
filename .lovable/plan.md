

## Plan: Balance Mensual por Empleado

### Qué se construye
Un nuevo componente `BalanceMensualHoras` que muestra una tabla resumen mensual con una fila por empleado, columnas de horas efectivas totales, horas esperadas totales, y balance acumulado del mes. Permite ver de un vistazo quién debe horas y quién tiene horas a favor.

### Diseño de la vista

```text
┌─────────────────────────────────────────────────────────────┐
│ 📊 Balance Mensual de Horas                                │
│ Acumulado mensual por empleado                              │
│                                                             │
│ [Selector Mes/Año]  [Sucursal ▼]  [Buscar...]  [Exportar]  │
├─────────────────────────────────────────────────────────────┤
│ Empleado      │ Sucursal │ Días  │ Hs Efectivas │ Esperadas │ Balance     │
│               │          │ Trab. │              │           │             │
│ Aragon, Marina│ JB Justo │  22   │  170h 30m    │ 176h 0m   │ -5h 30m 🔴 │
│ Galaz, Agust. │ JB Justo │  20   │  125h 10m    │ 120h 0m   │ +5h 10m 🟢 │
│ ...           │          │       │              │           │             │
└─────────────────────────────────────────────────────────────┘
```

### Lógica de datos
- Consulta `fichajes` del mes seleccionado (día 1 al último día)
- Para cada empleado, agrupa fichajes por día, calcula minutos trabajados (entrada→salida)
- Suma total de minutos trabajados en el mes
- Calcula esperados: `horas_jornada_estandar × días trabajados` (o `horas_semanales_objetivo / dias_laborales_semana × días`)
- Balance = efectivas - esperadas
- Colores: verde si balance > 0, rojo si < 0

### Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/fichero/BalanceMensualHoras.tsx` | Nuevo componente completo |
| `src/pages/Fichero.tsx` | Agregar tab "Balance Mensual" junto a "Balance Diario" |

### Detalles técnicos
- Reutiliza los mismos patrones de `BalanceDiarioHoras` (filtros, export, sucursales)
- Selector de mes con `<Select>` (últimos 6 meses)
- Tabla sorteable con las mismas utilidades (`fmtMin`, colores, avatars)
- ExportButton para Excel
- Pausas NO se descuentan (regla de negocio existente)

