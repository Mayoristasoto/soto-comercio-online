import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JustificarEventoDialog, type EventoJustificable } from "@/components/novedades/JustificarEventoDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularPatrones, esDiaClave, personasDeVacaciones, type ContextoPatrones } from "./analisis";
import { DIAS_LABEL, type FilaEmpleado } from "./types";

interface Props {
  fila: FilaEmpleado;
  mesesOrden: string[];
  ctx: ContextoPatrones;
  open: boolean;
  onClose: () => void;
  onJustificado?: () => void;
}

export function PatronesEmpleadoDialog({ fila, mesesOrden, ctx, open, onClose, onJustificado }: Props) {
  const [evento, setEvento] = useState<EventoJustificable | null>(null);
  const p = useMemo(() => calcularPatrones(fila, mesesOrden, ctx), [fila, mesesOrden, ctx]);
  const maxDia = Math.max(1, ...p.porDiaSemana.map((d) => d.cantidad));
  const totalAus = fila.ausencias.length;
  const pct = (n: number) => (totalAus ? `${Math.round((n * 100) / totalAus)}%` : "0%");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{fila.nombre} — Patrones de ausencia</DialogTitle>
          <DialogDescription>
            Índice del período: {fila.total.indice.toFixed(1)}% ({fila.total.ausentes} ausencias sobre{" "}
            {fila.total.esperados} días esperados) · {fila.total.justificadas} justificadas ·{" "}
            {fila.total.sinJustificar} sin justificar
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Por día de la semana</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {p.porDiaSemana.map((d) => (
                <div key={d.dia} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-muted-foreground">{DIAS_LABEL[d.dia]}</span>
                  <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${(d.cantidad * 100) / maxDia}%` }} />
                  </div>
                  <span className="w-10 text-right font-medium">{d.cantidad}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Señales de sistematicidad</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feriados, vísperas y lunes/sábados</span>
                <span className="font-medium">{p.diasClave} ({pct(p.diasClave)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Días con compañeros de vacaciones</span>
                <span className="font-medium">{p.conVacacionesDeOtros} ({pct(p.conVacacionesDeOtros)})</span>
              </div>
              {!!p.coincidenciasVacaciones.length && (
                <div className="rounded-md border p-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">¿Con quién coincide?</p>
                  {p.coincidenciasVacaciones.slice(0, 5).map((c) => (
                    <div key={c.nombre} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">
                        {c.nombre}
                        {c.es_encargado && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">Encargado</Badge>
                        )}
                      </span>
                      <span className="font-medium whitespace-nowrap">{c.cantidad} ({pct(c.cantidad)})</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Racha máxima consecutiva</span>
                <span className="font-medium">{p.rachaMax} día(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meses sobre su propio promedio</span>
                <span className="font-medium">{p.mesesSobrePromedio}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Motivos</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {p.porCategoria.length ? p.porCategoria.map((c) => (
                <div key={c.nombre} className="flex justify-between">
                  <span className="text-muted-foreground">{c.nombre}</span>
                  <span className="font-medium">{c.cantidad} ({pct(c.cantidad)})</span>
                </div>
              )) : <p className="text-muted-foreground">Sin ausencias en el período.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Índice por mes</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {mesesOrden.map((m) => {
                const c = fila.meses[m];
                return (
                  <div key={m} className="flex justify-between">
                    <span className="capitalize text-muted-foreground">
                      {format(new Date(m + "-01T00:00:00"), "MMMM yyyy", { locale: es })}
                    </span>
                    <span className="font-medium">
                      {c?.esperados ? `${c.indice.toFixed(1)}% (${c.ausentes}/${c.esperados})` : "—"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Detalle de ausencias</h4>
          <div className="overflow-auto max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Contexto</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fila.ausencias
                  .slice()
                  .sort((a, b) => a.fecha.localeCompare(b.fecha))
                  .map((a) => {
                    const enVac = personasDeVacaciones(ctx, a);
                    const conVac = enVac.length
                      ? `De vacaciones: ${enVac
                          .map((v) => (v.es_encargado ? `${v.nombre} (encargado)` : v.nombre))
                          .join(", ")}`
                      : null;
                    const clave = esDiaClave(a.fecha, a.dia_semana, ctx.feriados);
                    return (
                      <TableRow key={a.fecha}>
                        <TableCell>{format(new Date(a.fecha + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{DIAS_LABEL[a.dia_semana]}</TableCell>
                        <TableCell>
                          {a.categoria_nombre ? (
                            <Badge variant={a.es_justificada ? "secondary" : "outline"}>{a.categoria_nombre}</Badge>
                          ) : (
                            <Badge variant="destructive">Sin justificar</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[clave ? "Feriado/víspera" : null, conVac]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={a.categoria_nombre ? "ghost" : "outline"}
                            onClick={() =>
                              setEvento({
                                empleado_id: a.empleado_id,
                                empleado: fila.nombre,
                                fecha: a.fecha,
                                tipo_evento: "ausencia",
                                categoria_id: a.categoria_id,
                                observacion: a.observacion,
                              })
                            }
                          >
                            {a.categoria_nombre ? "Editar" : "Justificar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>

      <JustificarEventoDialog
        evento={evento}
        open={!!evento}
        onClose={() => setEvento(null)}
        onSaved={() => onJustificado?.()}
      />
    </Dialog>
  );
}
