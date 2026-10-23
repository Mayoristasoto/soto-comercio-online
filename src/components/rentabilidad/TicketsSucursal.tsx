import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, RefreshCw } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";

interface Fila {
  fecha: string;
  sucursal_id?: number;
  sucursal?: string;
  tickets: number;
  facturado?: number;
}

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
const hoy = new Date();

export default function TicketsSucursal() {
  const [desde, setDesde] = useState(format(startOfMonth(hoy), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(hoy, "yyyy-MM-dd"));
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ventas_tickets", rango?.desde, rango?.hasta],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ventas-tickets", {
        body: { desde: rango!.desde, hasta: rango!.hasta },
      });
      if (error) throw error;
      return data as { configured: boolean; datos: Fila[]; error?: string };
    },
    enabled: !!rango,
  });

  const filas = data?.datos || [];

  // Agregado por sucursal
  const porSucursal = new Map<string, { tickets: number; facturado: number }>();
  filas.forEach((f) => {
    const nombre = f.sucursal || `Sucursal ${f.sucursal_id ?? "?"}`;
    const acc = porSucursal.get(nombre) || { tickets: 0, facturado: 0 };
    acc.tickets += Number(f.tickets) || 0;
    acc.facturado += Number(f.facturado) || 0;
    porSucursal.set(nombre, acc);
  });
  const resumen = Array.from(porSucursal.entries()).sort((a, b) => b[1].tickets - a[1].tickets);
  const totalTickets = resumen.reduce((s, [, v]) => s + v.tickets, 0);
  const totalFacturado = resumen.reduce((s, [, v]) => s + v.facturado, 0);

  const detalleDiario = [...filas].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const rapido = (mesesAtras: number) => {
    const base = subMonths(hoy, mesesAtras);
    const d = format(startOfMonth(base), "yyyy-MM-dd");
    const h = mesesAtras === 0 ? format(hoy, "yyyy-MM-dd") : format(startOfMonth(subMonths(hoy, mesesAtras - 1)).getTime() - 86400000, "yyyy-MM-dd");
    setDesde(d); setHasta(h); setRango({ desde: d, hasta: h });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Tickets de venta por sucursal
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cantidad de comprobantes emitidos por sucursal, según el sistema de ventas (mayoristasoto).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => setRango({ desde, hasta })} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Consultar
          </Button>
          <div className="flex gap-1 items-center text-sm">
            <span className="text-muted-foreground mr-1">Rápido:</span>
            <Button variant="outline" size="sm" onClick={() => rapido(0)}>Este mes</Button>
            <Button variant="outline" size="sm" onClick={() => rapido(1)}>Mes anterior</Button>
          </div>
        </div>

        {data && !data.configured && (
          <p className="text-sm text-muted-foreground border rounded-md p-3">
            La conexión con el sistema de ventas todavía no está configurada. Avisale a quien administra el sistema.
          </p>
        )}
        {data?.error && (
          <p className="text-sm text-destructive border border-destructive/30 rounded-md p-3">{data.error}</p>
        )}

        {rango && data?.configured && !data.error && (
          <>
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">Tickets totales: <strong className="text-foreground">{totalTickets.toLocaleString("es-AR")}</strong></span>
              {totalFacturado > 0 && (
                <span className="text-muted-foreground">Facturado: <strong className="text-foreground">{fmt(totalFacturado)}</strong></span>
              )}
              {totalTickets > 0 && totalFacturado > 0 && (
                <span className="text-muted-foreground">Ticket promedio: <strong className="text-foreground">{fmt(totalFacturado / totalTickets)}</strong></span>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                  <TableHead className="text-right">Ticket promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!resumen.length ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin datos para este rango</TableCell></TableRow>
                ) : resumen.map(([nombre, v]) => (
                  <TableRow key={nombre}>
                    <TableCell className="font-medium">{nombre}</TableCell>
                    <TableCell className="text-right">{v.tickets.toLocaleString("es-AR")}</TableCell>
                    <TableCell className="text-right">{v.facturado > 0 ? fmt(v.facturado) : "-"}</TableCell>
                    <TableCell className="text-right">{v.tickets > 0 && v.facturado > 0 ? fmt(v.facturado / v.tickets) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {detalleDiario.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">Ver detalle día por día ({detalleDiario.length} filas)</summary>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Tickets</TableHead>
                      <TableHead className="text-right">Facturado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleDiario.map((f, i) => (
                      <TableRow key={`${f.fecha}-${f.sucursal_id}-${i}`}>
                        <TableCell>{f.fecha}</TableCell>
                        <TableCell>{f.sucursal || `Sucursal ${f.sucursal_id ?? "?"}`}</TableCell>
                        <TableCell className="text-right">{Number(f.tickets).toLocaleString("es-AR")}</TableCell>
                        <TableCell className="text-right">{Number(f.facturado) > 0 ? fmt(Number(f.facturado)) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
