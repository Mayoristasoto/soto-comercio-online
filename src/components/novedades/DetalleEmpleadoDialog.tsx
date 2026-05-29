import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ResumenEmpleado, NovedadRow } from "@/pages/NovedadesLiquidacion";
import { JustificarAusenciaDialog } from "./JustificarAusenciaDialog";

const ESTADO_LABEL: Record<string, { label: string; variant: any }> = {
  TRABAJADO: { label: "Trabajado", variant: "default" },
  FERIADO: { label: "Feriado", variant: "secondary" },
  VACACIONES: { label: "Vacaciones", variant: "outline" },
  LIC_MEDICA: { label: "Lic. Médica", variant: "secondary" },
  NO_FICHADA: { label: "NO FICHADA", variant: "destructive" },
  DIA_MEDICO: { label: "Día médico", variant: "secondary" },
  PERMISO: { label: "Permiso", variant: "outline" },
  MATRIMONIO: { label: "Matrimonio", variant: "outline" },
  FALLECIMIENTO_FAMILIAR: { label: "Fallecimiento", variant: "outline" },
  NACIMIENTO_HIJO: { label: "Nacimiento", variant: "outline" },
  EXAMEN_ESTUDIANTIL: { label: "Examen", variant: "outline" },
  MATERNIDAD: { label: "Maternidad", variant: "outline" },
  PATERNIDAD: { label: "Paternidad", variant: "outline" },
  DONACION_SANGRE: { label: "Donación sangre", variant: "outline" },
  ACTIVIDAD_GREMIAL: { label: "Gremial", variant: "outline" },
  LICENCIA_MEDICA: { label: "Lic. médica", variant: "secondary" },
  DIA_ESTUDIO: { label: "Día estudio", variant: "outline" },
  JUSTIFICACION_INASISTENCIA: { label: "Justificada", variant: "outline" },
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface Props {
  empleado: ResumenEmpleado;
  open: boolean;
  onClose: () => void;
  onJustified: () => void;
}

export function DetalleEmpleadoDialog({ empleado, open, onClose, onJustified }: Props) {
  const [justificarRow, setJustificarRow] = useState<NovedadRow | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{empleado.nombre} — Detalle día por día</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Hs esp.</TableHead>
                  <TableHead className="text-right">Hs trab.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleado.rows.map((r, i) => {
                  const meta = ESTADO_LABEL[r.estado] || { label: r.estado, variant: "outline" };
                  return (
                    <TableRow key={i} className={r.estado === "NO_FICHADA" ? "bg-destructive/5" : ""}>
                      <TableCell>{format(new Date(r.fecha + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{DIAS[r.dia_semana]}</TableCell>
                      <TableCell className="text-xs">
                        {r.hora_entrada_esperada?.slice(0, 5)}–{r.hora_salida_esperada?.slice(0, 5)}
                      </TableCell>
                      <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.detalle || "—"}</TableCell>
                      <TableCell className="text-right">{Number(r.horas_esperadas).toFixed(1)}</TableCell>
                      <TableCell className="text-right">{Number(r.horas_trabajadas).toFixed(1)}</TableCell>
                      <TableCell>
                        {r.estado === "NO_FICHADA" && (
                          <Button size="sm" variant="outline" onClick={() => setJustificarRow(r)}>
                            Justificar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {justificarRow && (
        <JustificarAusenciaDialog
          row={justificarRow}
          open={!!justificarRow}
          onClose={() => setJustificarRow(null)}
          onSaved={() => { setJustificarRow(null); onJustified(); }}
        />
      )}
    </>
  );
}
