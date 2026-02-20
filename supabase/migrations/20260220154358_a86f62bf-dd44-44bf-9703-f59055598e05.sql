
UPDATE empleado_cruces_rojas
SET 
  anulada = true, 
  motivo_anulacion = 'Eliminada por administrador - solo se mantiene 16/02/2026'
WHERE id IN (
  'ccd3a0f8-1479-4d3c-b63f-4814f050e74a',
  'ba6fa083-3310-4702-827c-1518891d43c7',
  '68a7a020-b3b6-4fd5-b8bd-e2d7a28497b5',
  '8cb0e848-5250-4059-b539-367c8ff28831'
);
