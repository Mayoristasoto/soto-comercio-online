
-- UPDATE cuil
UPDATE empleados SET cuil = '23411280454' WHERE id = '105996f4-9ad6-47b3-9da6-a8a544fb4228';
UPDATE empleados SET cuil = '20940995117' WHERE id = '15b5f20a-8c16-4a16-8782-04100f92f9f3';
UPDATE empleados SET cuil = '27363637448' WHERE id = 'b29bbea0-40a1-4a57-a322-c816ed527bc8';
UPDATE empleados SET cuil = '27303953375' WHERE id = '39571dd7-94f3-4fa5-84fc-ea6baadc8eec';
UPDATE empleados SET cuil = '20470558432' WHERE id = '54278134-59d7-4ac8-abd1-6bc906e871b3';
UPDATE empleados SET cuil = '20282000106' WHERE id = '08f7d06e-c871-4ff1-b0de-681aaea90d33';
UPDATE empleados SET cuil = '27310185707' WHERE id = '88f9934f-1b77-40b4-a79c-d054520b3354';
UPDATE empleados SET cuil = '20422825704' WHERE id = '7d756f49-6d00-420b-88cb-21bc4ecd1a39';
UPDATE empleados SET cuil = '23238877059' WHERE id = '6e1bd507-5956-45cf-97d9-2d07f55c9ccb';
UPDATE empleados SET cuil = '23353365339' WHERE id = '88b0e4b5-0355-4178-8900-bd4e0001a5d2';
UPDATE empleados SET cuil = '27420443000' WHERE id = '56cf495f-41ca-4615-8a57-05d62c429c9c';
UPDATE empleados SET cuil = '20382562985' WHERE id = '29c3fcca-971f-4073-abd1-6fb158d004a7';
UPDATE empleados SET cuil = '20267692212' WHERE id = '1607f6ba-046c-466d-8b4d-acc18e2acfa4';
UPDATE empleados SET cuil = '20340583818' WHERE id = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4';
UPDATE empleados SET cuil = '27229162301' WHERE id = 'dc830459-0aa7-4bbe-99f2-9f1080a60b3e';
UPDATE empleados SET cuil = '23359579969' WHERE id = '9871bc34-120f-42a8-a214-5d34a516d7f6';
UPDATE empleados SET cuil = '27318212312' WHERE id = '0da05020-7cb1-42f5-a8cd-02ffaff0f512';
UPDATE empleados SET cuil = '27363836351' WHERE id = '7f1fc94b-b452-4eff-a8b5-709398f857c1';
UPDATE empleados SET cuil = '20411280978' WHERE id = '5d23025c-613f-4774-8e63-f5c80a0acaa3';
UPDATE empleados SET cuil = '20231330136' WHERE id = '3891d395-4005-4a16-a3db-758d9503c652';
UPDATE empleados SET cuil = '27452916808' WHERE id = 'b17d2b3a-7f50-46fb-b370-4fe257514297';
UPDATE empleados SET cuil = '20386852964' WHERE id = '4fccd33d-b02f-494d-9706-24048ad995a9';

-- UPDATE nombres
UPDATE empleados SET nombre = 'Analia Victoria' WHERE id = '88f9934f-1b77-40b4-a79c-d054520b3354';
UPDATE empleados SET nombre = 'Carlos Adrián' WHERE id = '6e1bd507-5956-45cf-97d9-2d07f55c9ccb';
UPDATE empleados SET nombre = 'Agustina Lucía' WHERE id = '56cf495f-41ca-4615-8a57-05d62c429c9c';
UPDATE empleados SET nombre = 'Julio Cesar' WHERE id = '1607f6ba-046c-466d-8b4d-acc18e2acfa4';

-- UPDATE legajo
UPDATE empleados SET legajo = '36' WHERE id = '56cf495f-41ca-4615-8a57-05d62c429c9c';
UPDATE empleados SET legajo = '36' WHERE id = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4';
UPDATE empleados SET legajo = '52' WHERE id = '3891d395-4005-4a16-a3db-758d9503c652';

-- UPDATE DNI Justiniano
UPDATE empleados SET dni = '34058381' WHERE id = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4';

-- Datos sensibles: UPDATE directo en empleados_datos_sensibles
-- Upsert usando INSERT ON CONFLICT para cada empleado

INSERT INTO empleados_datos_sensibles (empleado_id, telefono, direccion, fecha_nacimiento)
VALUES
('105996f4-9ad6-47b3-9da6-a8a544fb4228', '2236006364', 'ANGELELLI 1443', '1998-04-09'),
('15b5f20a-8c16-4a16-8782-04100f92f9f3', '2235905254', 'FELIPE DE ARANA 5858', '1961-10-23'),
('b29bbea0-40a1-4a57-a322-c816ed527bc8', '2236035307', 'HEGUILOR 946', '1991-05-28'),
('39571dd7-94f3-4fa5-84fc-ea6baadc8eec', '2235281772', '3 DE FEBRERO 8736', '1983-07-17'),
('54278134-59d7-4ac8-abd1-6bc906e871b3', '2234481125', 'FELIPE DE ARANA 5858', '2005-07-28'),
('08f7d06e-c871-4ff1-b0de-681aaea90d33', '2235925253', 'CERRITO 1763', '1980-05-03'),
('88f9934f-1b77-40b4-a79c-d054520b3354', '2235969844', 'REFORMA UNIVERSITARIA 320', '1984-08-10'),
('6e1bd507-5956-45cf-97d9-2d07f55c9ccb', '2235305208', 'MIAMI 238 - SANTA CLARA', '1974-03-18'),
('88b0e4b5-0355-4178-8900-bd4e0001a5d2', '2236771965', 'CHACABUCO 6876', '1989-04-24'),
('56cf495f-41ca-4615-8a57-05d62c429c9c', '2235017919', 'GASCON 2709 1ºB', '1999-09-05'),
('29c3fcca-971f-4073-abd1-6fb158d004a7', '2236687121', 'ALVARADO 3969', '1994-01-17'),
('1607f6ba-046c-466d-8b4d-acc18e2acfa4', '1164018220', 'SAN LORENZO 4255', '1978-11-06'),
('dc830459-0aa7-4bbe-99f2-9f1080a60b3e', '2236921510', 'SAN SALVADOR 4264', '1973-03-18'),
('9871bc34-120f-42a8-a214-5d34a516d7f6', '2236698658', 'DON ORIONE 2524', '1991-04-21'),
('0da05020-7cb1-42f5-a8cd-02ffaff0f512', '2921496879', 'NAPOLES 4446', '1985-10-04'),
('a8f155d6-d8ce-49e9-8b5f-638c630a9088', '2236823743', 'PUAN 4546', '1950-12-19'),
('d9969a11-39e6-47c6-80b5-fe46a6234b15', '2236159781', 'PUAN 4546', '1977-04-10'),
('7f1fc94b-b452-4eff-a8b5-709398f857c1', '2236030735', 'JURAMENTO 752', '1991-09-07'),
('5d23025c-613f-4774-8e63-f5c80a0acaa3', '2234360227', 'ECHEVERRIA 1480', '1998-03-23'),
('b17d2b3a-7f50-46fb-b370-4fe257514297', '2236447630', 'PELLEGRINI 4540', '2003-07-14'),
('4fccd33d-b02f-494d-9706-24048ad995a9', '2234039953', 'ROQUE SAENZ PEÑA 6558', '1994-08-15')
ON CONFLICT (empleado_id) DO UPDATE SET
  telefono = COALESCE(EXCLUDED.telefono, empleados_datos_sensibles.telefono),
  direccion = COALESCE(EXCLUDED.direccion, empleados_datos_sensibles.direccion),
  fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados_datos_sensibles.fecha_nacimiento);

-- Justiniano: solo dirección (ya tiene tel y nacimiento)
UPDATE empleados_datos_sensibles SET direccion = 'DORREGO 1257' WHERE empleado_id = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4';

-- Voikli: solo dirección
UPDATE empleados_datos_sensibles SET direccion = '9 DE JULIO BIS 10341' WHERE empleado_id = '3891d395-4005-4a16-a3db-758d9503c652';
