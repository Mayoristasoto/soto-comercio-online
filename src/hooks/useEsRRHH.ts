import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRolePreview } from "@/contexts/RolePreviewContext";

/**
 * Devuelve si el usuario actual es admin de RRHH.
 * Solo para UI (mostrar/ocultar): la seguridad real está en RLS.
 * Si hay una vista de rol simulada activa, se respeta esa vista.
 */
export function useEsRRHH() {
  const preview = useRolePreview();
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

  // Vista simulada: la interfaz se comporta como el rol elegido
  if (preview?.enPreview && preview.rolVista) {
    return { esRRHH: false, rol: preview.rolVista as string, loading };
  }

  return { esRRHH, rol, loading };
}
