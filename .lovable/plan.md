
# Configurar generación automática de tareas diarias

## Situación actual

La plantilla "Control Ofertas" ya está correctamente configurada:
- Frecuencia: semanal flexible
- Objetivo: 3 veces por semana
- Asignada a: Julio Gomez Navarrete
- Recordatorio fin de semana: activado

**El problema**: la edge function `generar-tareas-diarias` no tiene un cron job configurado, por lo que solo se ejecutó manualmente 2 veces (11 y 12 de febrero). Esta semana (16-18 feb) no se generó ninguna tarea.

## Plan

### Paso 1 - Habilitar extensiones pg_cron y pg_net
Crear una migración para activar las extensiones necesarias para ejecutar funciones programadas.

### Paso 2 - Crear cron job diario
Configurar un job que ejecute `generar-tareas-diarias` todos los días a las 06:00 AM (hora del servidor), que es la hora configurada en la plantilla.

El cron llamará a la edge function via HTTP POST usando `net.http_post`.

### Paso 3 - Generar las tareas de hoy manualmente
Ejecutar la función una vez para que Julio reciba su tarea de "Control Ofertas" de hoy, ya que el cron empezará a funcionar a partir de mañana.

### Paso 4 - Limpiar tareas viejas
Las 2 tareas pendientes de la semana pasada (11 y 12 feb) ya vencieron. Se pueden marcar como vencidas o cancelarlas para que no interfieran.

## Resultado esperado

- Julio recibirá automáticamente la tarea "Control Ofertas" 3 veces por semana (lunes a viernes)
- Al hacer check-in facial, le aparecerá la alerta de tarea pendiente (gracias al fix anterior)
- El sábado, si no completó las 3, recibirá un recordatorio automático

## Detalle técnico

### Migración SQL (extensiones + cron)
```sql
-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron diario a las 06:00 UTC
SELECT cron.schedule(
  'generar-tareas-diarias',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://iizwnijtgfvanhqqjeyw.supabase.co/functions/v1/generar-tareas-diarias',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenduaWp0Z2Z2YW5ocXFqZXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODc1NzAsImV4cCI6MjA3MTQ2MzU3MH0.Ec7iJRVy0l2MgFHKVPi26AnRsXhFsUM7RhOOrE7eEvE"}'::jsonb,
    body:='{"time": "scheduled"}'::jsonb
  ) AS request_id;
  $$
);
```

### Ejecución manual para hoy
Invocar la edge function `generar-tareas-diarias` para generar la tarea de hoy inmediatamente.

### Limpieza de tareas viejas
Cancelar las 2 tareas de la semana pasada (11 y 12 feb) que quedaron pendientes.
