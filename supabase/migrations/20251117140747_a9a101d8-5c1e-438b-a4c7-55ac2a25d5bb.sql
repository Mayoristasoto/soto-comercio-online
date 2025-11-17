-- FASE 3: Tablas básicas de liquidación
CREATE TABLE IF NOT EXISTS public.liquidaciones_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  fecha_procesamiento TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'borrador',
  total_bruto NUMERIC(12,2) DEFAULT 0,
  total_deducciones NUMERIC(12,2) DEFAULT 0,
  total_neto NUMERIC(12,2) DEFAULT 0,
  cantidad_empleados INTEGER DEFAULT 0,
  procesado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recibos_sueldo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id UUID,
  empleado_id UUID,
  periodo VARCHAR(7) NOT NULL,
  conceptos_remunerativos JSONB DEFAULT '[]'::jsonb,
  deducciones JSONB DEFAULT '[]'::jsonb,
  total_remunerativo NUMERIC(12,2) DEFAULT 0,
  total_deducciones NUMERIC(12,2) DEFAULT 0,
  neto_a_pagar NUMERIC(12,2) DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.liquidaciones_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_sueldo ENABLE ROW LEVEL SECURITY;