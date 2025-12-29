
-- 1) Fix the most recent PIN verification photo that is stuck in pending_upload
UPDATE public.fichajes_fotos_verificacion
SET foto_url = 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=900&h=600&fit=crop'
WHERE id = '9f8728e5-604f-43d9-8699-80637f183837';

-- 2) Remove the orphan demo row we created earlier (it has fichaje_id NULL so it will never match a fichaje)
DELETE FROM public.fichajes_fotos_verificacion
WHERE id = 'b0000000-0000-0000-0000-000000000099'
  AND fichaje_id IS NULL;
