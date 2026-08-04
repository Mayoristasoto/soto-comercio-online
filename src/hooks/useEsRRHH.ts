import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Devuelve si el usuario actual es admin de RRHH.
 * Solo para UI (mostrar/ocultar): la seguridad real está en RLS.
 */
export function useEsRRHH() {
  const [esRRHH, setEsRRHH] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("current_user_role");
        if (!cancelado && !error) {
          const r = (data as string | null) ?? null;
          setRol(r);
          setEsRRHH(r === "admin_rrhh");
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return { esRRHH, rol, loading };
}
