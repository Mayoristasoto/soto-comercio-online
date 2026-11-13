import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Estado plegado/abierto recordado en este navegador. */
export function usePlegado(clave: string, porDefecto: boolean) {
  const [abierto, setAbierto] = useState<boolean>(() => {
    try { const v = localStorage.getItem(clave); return v === null ? porDefecto : v === "1"; } catch { return porDefecto; }
  });
  const cambiar = (v: boolean) => { setAbierto(v); try { localStorage.setItem(clave, v ? "1" : "0"); } catch { /* sin almacenamiento */ } };
  return [abierto, cambiar] as const;
}

export function Chevron({ abierto }: { abierto: boolean }) {
  return <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abierto ? "" : "-rotate-90"}`} />;
}

export function Seccion({ clave, titulo, resumen, porDefecto = false, extra, className = "", children }: {
  clave: string; titulo: ReactNode; resumen?: ReactNode; porDefecto?: boolean; extra?: ReactNode; className?: string; children: ReactNode;
}) {
  const [abierto, setAbierto] = usePlegado(clave, porDefecto);
  return (
    <div className={`rounded-xl border bg-card ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="flex flex-1 min-w-0 items-center gap-2 text-left">
          <Chevron abierto={abierto} />
          <span className="font-semibold text-sm">{titulo}</span>
          {resumen && <span className="truncate text-xs text-muted-foreground">{resumen}</span>}
        </button>
        {abierto && extra}
      </div>
      {abierto && <div className="border-t p-3">{children}</div>}
    </div>
  );
}
