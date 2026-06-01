import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export interface FeriadoTrabajadoRow {
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  fecha: string;
  feriado_nombre: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number;
}

export function FeriadosTrabajadosTable({ rows }: { rows: FeriadoTrabajadoRow[] }) {
  if (!rows.length) {
    return <p className="text-center py-8 text-muted-foreground">No hay empleados que hayan fichado en feriados en este período.</p>;
  }
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Feriado</TableHead>
            <TableHead>Empleado</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Salida</TableHead>
            <TableHead className="text-right">Hs trabajadas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{format(new Date(r.fecha + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
              <TableCell className="font-medium">{r.feriado_nombre}</TableCell>
              <TableCell>
                {r.empleado_apellido}, {r.empleado_nombre}
                {r.empleado_legajo && <span className="text-xs text-muted-foreground ml-2">#{r.empleado_legajo}</span>}
              </TableCell>
              <TableCell>{r.sucursal_nombre || "—"}</TableCell>
              <TableCell>{r.hora_entrada?.slice(0, 5) || "—"}</TableCell>
              <TableCell>{r.hora_salida?.slice(0, 5) || "—"}</TableCell>
              <TableCell className="text-right font-mono">{Number(r.horas_trabajadas).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
