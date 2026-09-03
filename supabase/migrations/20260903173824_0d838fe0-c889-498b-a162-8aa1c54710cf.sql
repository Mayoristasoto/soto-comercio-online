GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_plantillas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_controles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_control_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_item_fotos TO authenticated;
GRANT ALL ON public.checklist_plantillas TO service_role;
GRANT ALL ON public.checklist_controles TO service_role;
GRANT ALL ON public.checklist_control_items TO service_role;
GRANT ALL ON public.checklist_item_fotos TO service_role;