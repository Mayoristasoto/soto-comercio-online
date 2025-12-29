
-- Insert demo fichaje first, then the photo
INSERT INTO fichajes (
  id,
  empleado_id,
  tipo,
  timestamp_real,
  estado,
  metodo,
  confianza_facial
) VALUES (
  'a0000000-0000-0000-0000-000000000099',
  '0da05020-7cb1-42f5-a8cd-02ffaff0f512',
  'entrada',
  NOW(),
  'valido',
  'pin',
  NULL
) ON CONFLICT (id) DO UPDATE SET timestamp_real = NOW();

-- Then insert demo verification photo with all required columns
INSERT INTO fichajes_fotos_verificacion (
  id,
  fichaje_id,
  empleado_id,
  foto_url,
  foto_storage_path,
  metodo_fichaje,
  timestamp_captura
) VALUES (
  'b0000000-0000-0000-0000-000000000099',
  'a0000000-0000-0000-0000-000000000099',
  '0da05020-7cb1-42f5-a8cd-02ffaff0f512',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  'demo/test-photo.jpg',
  'pin',
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  foto_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', 
  timestamp_captura = NOW();
