import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  sucursal_id?: string | null;
}

interface Props {
  value: string[]; // empleado_ids
  onChange: (ids: string[]) => void;
}

export function EmpleadosAfectadosPicker({ value, onChange }: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, avatar_url, sucursal_id")
        .eq("activo", true)
        .order("nombre");
      setEmpleados((data ?? []) as Empleado[]);
    })();
  }, []);

  const seleccionados = useMemo(
    () => empleados.filter((e) => value.includes(e.id)),
    [empleados, value]
  );

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return empleados
      .filter((e) => !value.includes(e.id))
      .filter((e) => !q || `${e.nombre} ${e.apellido}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [empleados, value, query]);

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery("");
  };
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[2rem] p-2 border rounded-md bg-background">
        {seleccionados.length === 0 && (
          <span className="text-xs text-muted-foreground self-center">
            Sin empleados afectados
          </span>
        )}
        {seleccionados.map((e) => (
          <Badge key={e.id} variant="secondary" className="gap-1 pr-1">
            <AtSign className="h-3 w-3" />
            {e.nombre} {e.apellido}
            <button
              type="button"
              onClick={() => remove(e.id)}
              className="ml-1 hover:text-destructive"
              aria-label="Quitar"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar empleado para arrobar..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && filtrados.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <ScrollArea className="max-h-56">
              {filtrados.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => add(e.id)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent text-left"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={e.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {e.nombre[0]}
                      {e.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  {e.nombre} {e.apellido}
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
