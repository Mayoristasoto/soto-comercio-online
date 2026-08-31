import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export interface VacacionNovedadRow {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  empleado_legajo: string | null;
  sucursal_nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  periodo_devengado: number | null;
  dias_en_periodo: number;
}

const fmt = (d: string) => format(new Date(d + "T00:00:00"), "dd/MM/yyyy");

export function VacacionesNovedadesTable({ rows }: { rows: VacacionNovedadRow[] }) {
  if (!rows.length) return <p className="text-center py-12 text-muted-foreground">Sin vacaciones en el período</p>;
  const totalDias = rows.reduce((a, r) => a + r.dias_en_periodo, 0);
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead>Hasta</TableHead>
            <TableHead className="text-center">Días en el período</TableHead>
            <TableHead className="text-center">Período devengado</TableHead>
            <TableHead className="text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {r.empleado_nombre}
                {r.empleado_legajo && <span className="text-xs text-muted-foreground ml-2">#{r.empleado_legajo}</span>}
              </TableCell>
              <TableCell>{r.sucursal_nombre || "—"}</TableCell>
              <TableCell>{fmt(r.fecha_inicio)}</TableCell>
              <TableCell>{fmt(r.fecha_fin)}</TableCell>
              <TableCell className="text-center font-semibold">{r.dias_en_periodo}</TableCell>
              <TableCell className="text-center">{r.periodo_devengado ?? "—"}</TableCell>
              <TableCell className="text-center">
                <Badge variant={r.estado === "gozadas" ? "secondary" : "default"}>{r.estado}</Badge>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={4} className="text-right font-semibold">Total días</TableCell>
            <TableCell className="text-center font-bold">{totalDias}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
