import { useRolePreview } from "@/contexts/RolePreviewContext"

/**
 * Único punto de verdad para decidir qué muestra la interfaz.
 * Si hay una vista de rol simulada activa (selector "Ver como"), devuelve ese rol;
 * si no, devuelve el rol real que la pantalla ya cargó (o el del contexto).
 *
 * Solo afecta la interfaz: los permisos reales siguen en RLS.
 */
export function useRolEfectivo(rolReal?: string | null): string | null {
  const preview = useRolePreview()
  if (preview?.enPreview && preview.rolVista) return preview.rolVista
  return rolReal ?? preview?.rolReal ?? null
}
