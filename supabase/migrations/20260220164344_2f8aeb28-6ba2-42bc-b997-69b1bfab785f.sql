
-- Insertar cruce roja faltante para Julio Gomez Navarrete: 03/02/2026 (martes) — 3 min tarde
-- Fichaje: 07:33 ART, horario programado: 07:30, fichaje_id: 4e906876-0d18-461f-b8ea-98b4133f5518
INSERT INTO empleado_cruces_rojas (
  empleado_id,
  tipo_infraccion,
  fecha_infraccion,
  minutos_diferencia,
  fichaje_id,
  observaciones,
  anulada
) VALUES (
  '1607f6ba-046c-466d-8b4d-acc18e2acfa4',
  'llegada_tarde',
  '2026-02-03',
  3,
  '4e906876-0d18-461f-b8ea-98b4133f5518',
  'Llegada tarde en kiosco: 07:33 a. m. (programado: 07:30, tolerancia: 1 min)',
  false
);
