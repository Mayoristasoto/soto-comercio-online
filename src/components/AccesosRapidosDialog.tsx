import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { AccesoRapido } from "@/hooks/useAccesosRapidos";

interface SeccionDisponible {
  path: string;
  nombre: string;
  icon: string;
  grupo?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secciones: SeccionDisponible[];
  accesos: AccesoRapido[];
  onToggle: (acceso: AccesoRapido) => void;
}

export function AccesosRapidosDialog({ open, onOpenChange, secciones, accesos, onToggle }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return secciones;
    return secciones.filter(
      (s) => s.nombre.toLowerCase().includes(q) || (s.grupo || "").toLowerCase().includes(q)
    );
  }, [secciones, busqueda]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Accesos rápidos</DialogTitle>
          <DialogDescription>
            Elegí las secciones que querés fijar arriba en el menú principal.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar sección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[55vh] pr-2">
          <div className="space-y-1">
            {filtradas.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No hay secciones que coincidan.</p>
            )}
            {filtradas.map((s) => {
              const activo = accesos.some((a) => a.path === s.path);
              return (
                <Button
                  key={s.path}
                  type="button"
                  variant="ghost"
                  onClick={() => onToggle({ path: s.path, nombre: s.nombre, icon: s.icon })}
                  className={`h-auto w-full justify-between gap-2 px-3 py-2 text-left ${
                    activo ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{s.nombre}</span>
                    {s.grupo && (
                      <span className="truncate text-xs text-muted-foreground">{s.grupo}</span>
                    )}
                  </span>
                  {activo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
