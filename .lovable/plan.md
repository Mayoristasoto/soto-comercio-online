## Sembrar categorías comunes de justificación

El editor de categorías ya existe (botón "Categorías" arriba a la derecha). Sólo voy a precargar categorías típicas para que estén disponibles desde el primer momento, y vos podés agregar/quitar/editar las que quieras desde ese mismo botón.

### Categorías a insertar

Si no existen ya (match por nombre, case-insensitive):

| Nombre | Justifica | Color |
|---|---|---|
| Vacaciones | ✅ | #16a34a (verde) |
| Licencia médica | ✅ | #0ea5e9 (celeste) |
| Día médico | ✅ | #38bdf8 |
| Turno médico | ✅ | #60a5fa |
| Trámite personal autorizado | ✅ | #a855f7 |
| Evento de empresa | ✅ | #f59e0b (ámbar) |
| Capacitación | ✅ | #8b5cf6 |
| Franco compensatorio | ✅ | #14b8a6 |
| Día de estudio / examen | ✅ | #6366f1 |
| Maternidad / Paternidad | ✅ | #ec4899 |
| Fallecimiento familiar | ✅ | #64748b |
| Matrimonio | ✅ | #f472b6 |
| ART / Accidente laboral | ✅ | #dc2626 |
| Licencia sin goce | ✅ | #94a3b8 |
| Cambio de turno no actualizado | ✅ | #95198d |
| Falla técnica de fichaje | ✅ | #4b0d6d |
| Justificada (otro) | ✅ | #6b7280 |
| Sin justificar | ❌ | #ef4444 |

### Cómo se hace

Migración SQL idempotente con `INSERT ... WHERE NOT EXISTS` sobre `categorias_justificacion_asistencia` (la tabla, RLS y editor ya están listos). No toca código de la app.

### Después de la migración

- En el informe vas a ver todas las categorías nuevas en el selector.
- Botón **"Categorías"** (arriba a la derecha del informe) para agregar/quitar/editar nombre, color, si justifica o no, y activarlas/desactivarlas.
