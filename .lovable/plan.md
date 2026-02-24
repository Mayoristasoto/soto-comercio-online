
## Plan: Limpiar todas las tareas y empezar desde cero

### Que se va a eliminar

| Tabla | Registros | Accion |
|-------|-----------|--------|
| `tareas` | 26 tareas | Eliminar todas |
| `tareas_generadas_log` | 14 logs | Eliminar todos |
| `tareas_plantillas` | 5 plantillas | Resetear `ultima_generacion` a null (mantener las plantillas) |

### Plantillas existentes (se mantienen)
1. **Reposicion exhibidor cigarrillos** - diaria, activa
2. **Control Ofertas** - semanal_flexible, activa
3. **Apagado de luces** - diaria, inactiva
4. **Limpieza de area de trabajo** - semanal, activa
5. **Control Stock Cigarrillos** - diaria, activa

### Pasos
1. Eliminar todos los registros de `tareas_generadas_log` (para que el generador no crea que ya genero tareas)
2. Eliminar todas las tareas de la tabla `tareas`
3. Resetear `ultima_generacion` en todas las plantillas a null
4. La proxima ejecucion del cron (06:00 UTC) generara tareas frescas

### Nota
Las plantillas se mantienen intactas para que puedan seguir generando tareas automaticamente. Solo se borran las tareas generadas y sus logs.
