import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendario, fetchCompartidos, compartirCalendario, quitarCompartido, Permiso } from "@/lib/calendariosService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendario: Calendario | null;
}

interface EmpleadoLite { id: string; nombre: string; apellido: string | null; }

export function CompartirCalendarioDialog({ open, onOpenChange, calendario }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [compartidos, setCompartidos] = useState<any[]>([]);
  const [permiso, setPermiso] = useState<Permiso>("view");

  const reload = async () => {
    if (!calendario) return;
    setCompartidos(await fetchCompartidos(calendario.id));
  };

  useEffect(() => {
    if (open) reload();
    else { setSearch(""); setEmpleados([]); }
  }, [open, calendario]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.trim().length < 2) { setEmpleados([]); return; }
      const { data } = await supabase
        .from("empleados")
        .select("id, nombre, apellido")
        .eq("activo", true)
        .or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`)
        .limit(8);
      setEmpleados((data ?? []) as any);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const compartir = async (emp: EmpleadoLite) => {
    if (!calendario) return;
    try {
      await compartirCalendario(calendario.id, emp.id, permiso);
      toast({ title: "Calendario compartido" });
      setSearch("");
      setEmpleados([]);
      reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const quitar = async (id: string) => {
    try {
      await quitarCompartido(id);
      reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir "{calendario?.nombre}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empleado por nombre..."
              className="flex-1"
            />
            <Select value={permiso} onValueChange={(v) => setPermiso(v as Permiso)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Ver</SelectItem>
                <SelectItem value="edit">Editar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {empleados.length > 0 && (
            <div className="border rounded-md divide-y">
              {empleados.map((e) => (
                <button
                  key={e.id}
                  onClick={() => compartir(e)}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                >
                  {e.nombre} {e.apellido ?? ""}
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Compartido con ({compartidos.length})
            </p>
            <div className="space-y-1 max-h-60 overflow-auto">
              {compartidos.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no compartido con nadie.</p>
              )}
              {compartidos.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/40">
                  <div className="text-sm">
                    {c.empleados?.nombre} {c.empleados?.apellido ?? ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {c.permiso === "edit" ? "Editor" : "Lector"}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => quitar(c.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
