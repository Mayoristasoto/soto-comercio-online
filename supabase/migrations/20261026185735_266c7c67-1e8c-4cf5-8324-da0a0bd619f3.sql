update public.app_pages set orden = orden + 1, updated_at = now() where parent_id = 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'::uuid and orden >= 7;

update public.app_pages set parent_id = 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'::uuid, orden = 7, updated_at = now() where id = '5bc86f98-9132-487d-8a1d-4839822ef05f'::uuid;