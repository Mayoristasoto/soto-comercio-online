-- Insert example prizes into the premios table
INSERT INTO public.premios (nombre, descripcion, tipo, monto_presupuestado, stock, criterios_eligibilidad, participantes, activo) VALUES
('Voucher de $1000', 'Vale de compra por $1000 pesos para usar en comercios adheridos', 'digital', 1000, 50, '{"puntos_requeridos": 100}', '[]', true),
('Botella de Agua Premium', 'Botella de agua de acero inoxidable con logo de la empresa', 'fisico', 2500, 25, '{"puntos_requeridos": 50}', '[]', true),
('Día Libre Extra', 'Un día libre adicional a los días de vacaciones regulares', 'experiencia', 0, 12, '{"puntos_requeridos": 200}', '[]', true),
('Descuento 20% Gimnasio', 'Descuento del 20% en membresía de gimnasio por 3 meses', 'descuento', 1500, 10, '{"puntos_requeridos": 150}', '[]', true),
('Certificado de Reconocimiento', 'Certificado impreso de reconocimiento al empleado destacado', 'reconocimiento', 500, 100, '{"puntos_requeridos": 75}', '[]', true),
('Almuerzo con Gerencia', 'Almuerzo especial con la gerencia de la empresa', 'experiencia', 3000, 5, '{"puntos_requeridos": 300}', '[]', true),
('Auriculares Bluetooth', 'Auriculares inalámbricos de alta calidad', 'fisico', 4500, 15, '{"puntos_requeridos": 180}', '[]', true),
('Gift Card Amazon $500', 'Tarjeta de regalo digital para compras en Amazon', 'digital', 500, 30, '{"puntos_requeridos": 80}', '[]', true);