
UPDATE app_pages 
SET roles_permitidos = array_remove(roles_permitidos, 'empleado')
WHERE id IN (
  '877159ad-a422-4a78-9ae4-f0e88ab9d2a8',
  'aad8b438-6b51-48f0-a27a-2d56f8604f66',
  'a8e4b971-42be-4137-b561-f85213411727',
  '759f52e4-936c-4154-a314-c0bd4cdf04e9',
  'a1e3ec66-4aba-4550-80a9-db6aadff7681'
);
