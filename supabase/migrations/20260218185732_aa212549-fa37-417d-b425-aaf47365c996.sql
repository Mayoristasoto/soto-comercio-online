-- Cron job diario a las 06:00 UTC para generar tareas
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