import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";

export type ModoRotacion = "puesto" | "sucursal";

export interface FilaRotacion {
  empleado_id: string;
  nombre: string;
  sucursal_id: string | null;
  sucursal_nombre: string;
  entrada: string;
  salida: string;
  pausa: number;
  extras: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Fechas de la semana (lunes a domingo) */
  dias: string[];
  diasCorto: string[];
  /** Filas planificadas por fecha */
  filasPorDia: Record<string, FilaRotacion[]>;
  onAplicar: (args: {
    empleadoA: string;
    empleadoB: string;
    modo: ModoRotacion;
    diasIdx: number[];
  }) => void;
}

const fechaCorta = (f: string) => f.slice(8, 10) + "/" + f.slice(5, 7);

/** Intercambia dos empleados entre sucursales sobre la planificación semanal (borrador) */
export function RotarEmpleadosDialog({
  open,
  onOpenChange,
  dias,
  diasCorto,
  filasPorDia,
  onAplicar,
}: Props) {
  const [empA, setEmpA] = useState("");
  const [empB, setEmpB] = useState("");
  const [modo, setModo] = useState<ModoRotacion>("puesto");
  const [diasSel, setDiasSel] = useState<number[]>(() => dias.map((_, i) => i));

  const empleados = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; sucursales: Set<string> }>();
    for (const f of dias) {
      for (const fila of filasPorDia[f] ?? []) {
        const actual =
          map.get(fila.empleado_id) ??
          { id: fila.empleado_id, nombre: fila.nombre, sucursales: new Set<string>() };
        actual.sucursales.add(fila.sucursal_nombre);
        map.set(fila.empleado_id, actual);
      }
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [dias, filasPorDia]);

  const label = (id: string) => {
    const e = empleados.find((x) => x.id === id);
    return e ? `${e.nombre} (${[...e.sucursales].join(" / ")})` : "";
  };

  const preview = useMemo(() => {
    if (!empA || !empB) return [];
    return diasSel
      .slice()
      .sort((a, b) => a - b)
      .map((idx) => {
        const fecha = dias[idx];
        const filas = filasPorDia[fecha] ?? [];
        const a = filas.find((f) => f.empleado_id === empA);
        const b = filas.find((f) => f.empleado_id === empB);
        return { idx, fecha, a, b };
      })
      .filter((d) => d.a || d.b);
  }, [empA, empB, diasSel, dias, filasPorDia]);

  const aplicar = () => {
    onAplicar({ empleadoA: empA, empleadoB: empB, modo, diasIdx: diasSel });
    onOpenChange(false);
  };

  const toggleDia = (i: number) =>
    setDiasSel((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rotar empleados entre sucursales</DialogTitle>
          <DialogDescription>
            Intercambia dos empleados sobre la planificación de la semana. No modifica el legajo ni
            los turnos asignados: se guarda al usar “Guardar semana”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Empleado A</Label>
              <Select value={empA} onValueChange={setEmpA}>
                <SelectTrigger>
                  <SelectValue placeholder="— Elegir —" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre} · {[...e.sucursales].join(" / ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Empleado B</Label>
              <Select value={empB} onValueChange={setEmpB}>
                <SelectTrigger>
                  <SelectValue placeholder="— Elegir —" />
                </SelectTrigger>
                <SelectContent>
                  {empleados
                    .filter((e) => e.id !== empA)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre} · {[...e.sucursales].join(" / ")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Modo</Label>
            <Select value={modo} onValueChange={(v) => setModo(v as ModoRotacion)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="puesto">
                  Intercambiar puesto (cada uno toma el horario del otro)
                </SelectItem>
                <SelectItem value="sucursal">
                  Solo cambiar de sucursal (mantiene su horario)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Días alcanzados</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDiasSel(dias.map((_, i) => i))}
                >
                  Toda la semana
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDiasSel([])}>
                  Ninguno
                </Button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-4 sm:grid-cols-7 gap-2">
              {dias.map((f, i) => {
                const sel = diasSel.includes(i);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleDia(i)}
                    className={`rounded-md border px-2 py-2 text-left text-sm transition-colors ${
                      sel ? "border-primary bg-primary/10" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="font-medium">{diasCorto[i]}</div>
                    <div className="text-[11px] text-muted-foreground">{fechaCorta(f)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {empA && empB && (
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-xs font-medium">
                Vista previa · {label(empA)} <ArrowLeftRight className="inline h-3 w-3 mx-1" />{" "}
                {label(empB)}
              </div>
              <div className="max-h-52 overflow-auto divide-y text-xs">
                {preview.length === 0 && (
                  <p className="px-3 py-2 text-muted-foreground">
                    Ninguno de los dos tiene tramos en los días elegidos.
                  </p>
                )}
                {preview.map(({ idx, fecha, a, b }) => (
                  <div key={fecha} className="px-3 py-2 space-y-1">
                    <div className="font-medium">
                      {diasCorto[idx]} {fechaCorta(fecha)}
                    </div>
                    {a && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span>{a.nombre}:</span>
                        <Badge variant="outline">
                          {a.sucursal_nombre} {a.entrada}-{a.salida}
                        </Badge>
                        <ArrowLeftRight className="h-3 w-3" />
                        <Badge variant="secondary">
                          {b ? b.sucursal_nombre : a.sucursal_nombre}{" "}
                          {modo === "puesto" && b ? `${b.entrada}-${b.salida}` : `${a.entrada}-${a.salida}`}
                        </Badge>
                      </div>
                    )}
                    {b && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span>{b.nombre}:</span>
                        <Badge variant="outline">
                          {b.sucursal_nombre} {b.entrada}-{b.salida}
                        </Badge>
                        <ArrowLeftRight className="h-3 w-3" />
                        <Badge variant="secondary">
                          {a ? a.sucursal_nombre : b.sucursal_nombre}{" "}
                          {modo === "puesto" && a ? `${a.entrada}-${a.salida}` : `${b.entrada}-${b.salida}`}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={aplicar} disabled={!empA || !empB || !diasSel.length}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Aplicar rotación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RotarEmpleadosDialog;
