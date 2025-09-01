-- Fix security warnings by adding search_path to functions
ALTER FUNCTION public.actualizar_presupuesto_premio() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.get_presupuesto_resumen() SECURITY DEFINER SET search_path = public;