import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { FilaEmpleado } from "./types";

const colorCelda = (indice: number, esperados: number) => {
  if (!esperados) return "bg-muted/30 text-muted-foreground";
  if (indice === 0) return "bg-emerald-50 text-emerald-700";
  if (indice < 5) return "bg-emerald-100 text-emerald-800";
  if (indice < 10) return "bg-amber-100 text-amber-800";
  if (indice < 20) return "bg-orange-200 text-orange-900";
  return "bg-red-300 text-red-950 font-semibold";
};

const labelMes = (m: string) => format(new Date(m + "-01T00:00:00"), "MMM yy", { locale: es });

interface Props {
  filas: FilaEmpleado[];
  mesesOrden: string[];
  onSelect: (f: FilaEmpleado) => void;
}

export function MatrizAusentismo({ filas, mesesOrden, onSelect }: Props) {
  if (!filas.length) {
    return <p className="text-center py-10 text-muted-foreground">Sin datos para el período y filtros seleccionados.</p>;
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background min-w-[220px]">Empleado</TableHead>
            {mesesOrden.map((m) => (
              <TableHead key={m} className="text-center capitalize whitespace-nowrap">{labelMes(m)}</TableHead>
            ))}
            <TableHead className="text-center">Período</TableHead>
            <TableHead className="text-center">Tend.</TableHead>
            <TableHead>Alertas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.empleado_id} className="cursor-pointer hover:bg-muted/40" onClick={() => onSelect(f)}>
              <TableCell className="sticky left-0 bg-background">
                <div className="font-medium">{f.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {f.sucursal_nombre || "—"}{f.legajo ? ` · #${f.legajo}` : ""}
                </div>
              </TableCell>
              {mesesOrden.map((m) => {
                const c = f.meses[m];
                return (
                  <TableCell key={m} className="p-1 text-center">
                    <div
                      className={`rounded px-2 py-1 text-xs ${colorCelda(c?.indice || 0, c?.esperados || 0)}`}
                      title={
                        c?.esperados
                          ? `Ausentes ${c.ausentes} / esperados ${c.esperados} · justificadas ${c.justificadas} · sin justificar ${c.sinJustificar}`
                          : "Sin días esperados"
                      }
                    >
                      {c?.esperados ? `${c.indice.toFixed(0)}%` : "—"}
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className="text-center">
                <div className={`rounded px-2 py-1 text-xs ${colorCelda(f.total.indice, f.total.esperados)}`}>
                  {f.total.esperados ? `${f.total.indice.toFixed(1)}%` : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {f.total.ausentes}/{f.total.esperados} días
                </div>
              </TableCell>
              <TableCell className="text-center text-xs">
                {Math.abs(f.tendencia) < 0.5 ? (
                  <span className="text-muted-foreground">=</span>
                ) : f.tendencia > 0 ? (
                  <span className="text-red-600 inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />+{f.tendencia.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-emerald-600 inline-flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />{f.tendencia.toFixed(1)}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {f.alertas.map((a) => (
                    <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
