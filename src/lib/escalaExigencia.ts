export function nivelEscala(n: number) {
  if (n >= 5) return { tono: "bg-destructive/15 text-destructive border-destructive/40", frase: "Ya tenés un apercibimiento este mes." }
  if (n >= 3) return { tono: "bg-accent/20 text-accent-foreground border-accent/50", frase: `Tenés un llamado de atención. Te ${5 - n === 1 ? "falta 1" : `faltan ${5 - n}`} para un apercibimiento.` }
  if (n === 2) return { tono: "bg-secondary/20 text-secondary-foreground border-secondary/50", frase: "Con la próxima falta queda un llamado de atención en tu legajo." }
  return { tono: "bg-primary/10 text-primary border-primary/30", frase: n === 1 ? "Con la próxima falta se avisa a tu encargado y a RRHH." : "Vas muy bien este mes." }
}
