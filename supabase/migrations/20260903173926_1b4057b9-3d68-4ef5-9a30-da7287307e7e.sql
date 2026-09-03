GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_plantilla_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_control_encargados TO authenticated;
GRANT ALL ON public.checklist_plantilla_items TO service_role;
GRANT ALL ON public.checklist_control_encargados TO service_role;