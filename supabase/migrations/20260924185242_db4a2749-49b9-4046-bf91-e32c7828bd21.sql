DROP TRIGGER IF EXISTS trg_etapa_gen ON public.solicitudes_generales;
UPDATE public.solicitudes_generales SET etapa='rrhh' WHERE etapa='gerente';