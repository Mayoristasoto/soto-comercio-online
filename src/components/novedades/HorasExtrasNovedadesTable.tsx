import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export interface HoraExtraNovedadRow {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  sucursal_nombre: string | null;
  fecha: string;
  es_domingo: boolean;
  entrada: string | null;
  salida: string | null;
  extra_hs: number;
  monto: number;
}

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function HorasExtrasNovedadesTable({ rows }: { rows: HoraExtraNovedadRow[] }) {
  const porEmpleado = useMemo(() => {
    const map = new Map<string, { nombre: string; sucursal: string | null; hs: number; hsDomingo: number; monto: number; jornadas: number }>();
    for (const r of rows) {
      const k = r.empleado_id || r.empleado_nombre;
      let acc = map.get(k);
      if (!acc) { acc = { nombre: r.empleado_nombre, sucursal: r.sucursal_nombre, hs: 0, hsDomingo: 0, monto: 0, jornadas: 0 }; map.set(k, acc); }
      acc.jornadas++;
      acc.monto += Number(r.monto || 0);
      if (r.es_domingo) acc.hsDomingo += Number(r.extra_hs || 0);
      else acc.hs += Number(r.extra_hs || 0);
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rows]);

  if (!rows.length) return <p className="text-center py-12 text-muted-foreground">Sin horas extras liquidadas en el período</p>;

  const tot = porEmpleado.reduce((a, e) => ({ hs: a.hs + e.hs, hsD: a.hsD + e.hsDomingo, monto: a.monto + e.monto }), { hs: 0, hsD: 0, monto: 0 });

  return (
    <div className="space-y-6 overflow-auto">
      <div>
        <h4 className="font-semibold mb-2">Resumen por empleado</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead className="text-center">Jornadas</TableHead>
              <TableHead className="text-right">Hs hábiles</TableHead>
              <TableHead className="text-right">Hs domingo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {porEmpleado.map(e => (
              <TableRow key={e.nombre}>
                <TableCell className="font-medium">{e.nombre}</TableCell>
                <TableCell>{e.sucursal || "—"}</TableCell>
                <TableCell className="text-center">{e.jornadas}</TableCell>
                <TableCell className="text-right">{e.hs.toFixed(1)}</TableCell>
                <TableCell className="text-right">{e.hsDomingo.toFixed(1)}</TableCell>
                <TableCell className="text-right">{money(e.monto)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-semibold">Totales</TableCell>
              <TableCell className="text-right font-bold">{tot.hs.toFixed(1)}</TableCell>
              <TableCell className="text-right font-bold">{tot.hsD.toFixed(1)}</TableCell>
              <TableCell className="text-right font-bold">{money(tot.monto)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Detalle por jornada</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead className="text-right">Hs extra</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  {format(new Date(r.fecha + "T00:00:00"), "dd/MM/yyyy")}
                  {r.es_domingo && <Badge variant="secondary" className="ml-2">Domingo</Badge>}
                </TableCell>
                <TableCell>{r.empleado_nombre}</TableCell>
                <TableCell>{r.sucursal_nombre || "—"}</TableCell>
                <TableCell>{r.entrada?.slice(0, 5) || "—"}</TableCell>
                <TableCell>{r.salida?.slice(0, 5) || "—"}</TableCell>
                <TableCell className="text-right">{Number(r.extra_hs).toFixed(1)}</TableCell>
                <TableCell className="text-right">{money(Number(r.monto || 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
