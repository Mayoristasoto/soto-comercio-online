// Devuelve el rol que debe regir la interfaz: si hay una vista simulada
// activa ("Ver como") y el rol real es admin_rrhh, devuelve el rol simulado.
// Pensado para código no-hook (fetchs async, guards de acceso).
export function rolConPreview(rolReal: string | null | undefined): string | null {
  const real = rolReal ?? null
  if (real !== "admin_rrhh") return real
  try {
    const simulado = sessionStorage.getItem("role_preview_rol")
    if (simulado) return simulado
  } catch {
    // sessionStorage no disponible
  }
  return real
}
