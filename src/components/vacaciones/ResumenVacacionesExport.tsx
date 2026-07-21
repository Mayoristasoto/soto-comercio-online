import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Download, FileSpreadsheet, FileText, FileDown, Loader2 } from "lucide-react";
import { parseISO, differenceInCalendarDays, format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PATRONES_EXCLUSION = {
  contiene: ["demo", "dwaddw", "dwadad", "test", "prueba"],
  apellidoExacto: ["soto"],
};

function esEmpleadoExcluido(nombre: string, apellido: string): boolean {
  const n = (nombre ?? "").toLowerCase().trim();
  const a = (apellido ?? "").toLowerCase().trim();
  if (PATRONES_EXCLUSION.apellidoExacto.includes(a)) return true;
  for (const p of PATRONES_EXCLUSION.contiene) {
    if (n.includes(p) || a.includes(p)) return true;
  }
  return false;
}

interface Row {
  sucursal: string;
  empleado: string;
  ingreso: string;
  total: number;
  tomados: number;
  aprobadas: number;
  pendientes: number;
  restantes: number;
}

async function armarResumen(anio: number): Promise<Row[]> {
  const desde = `${anio}-01-01`;
  const hasta = `${anio}-12-31`;

  const [solRes, empRes, sucRes, calcRes] = await Promise.all([
    supabase
      .from("solicitudes_vacaciones")
      .select("empleado_id, fecha_inicio, fecha_fin, estado")
      .gte("fecha_inicio", desde)
      .lte("fecha_inicio", hasta),
    supabase.from("empleados").select("id, nombre, apellido, sucursal_id, activo"),
    supabase.from("sucursales").select("id, nombre").order("nombre"),
    supabase.rpc("obtener_calculo_vacaciones_todos", { p_anio: anio }),
  ]);

  if (solRes.error) throw solRes.error;
  if (empRes.error) throw empRes.error;
  if (sucRes.error) throw sucRes.error;
  if (calcRes.error) throw calcRes.error;

  const sucursalesMap = new Map<string, string>();
  (sucRes.data ?? []).forEach((s: any) => sucursalesMap.set(s.id, s.nombre));

  const calcMap = new Map<string, { dias: number; ingreso: string | null }>();
  (calcRes.data ?? []).forEach((c: any) => {
    calcMap.set(c.empleado_id, {
      dias: Number(c.dias_segun_ley ?? 0),
      ingreso: c.fecha_ingreso ?? null,
    });
  });

  const rows = new Map<string, Row & { _consumidos: number }>();
  for (const emp of (empRes.data ?? []) as any[]) {
    if (esEmpleadoExcluido(emp.nombre, emp.apellido)) continue;
    const calc = calcMap.get(emp.id);
    rows.set(emp.id, {
      sucursal: sucursalesMap.get(emp.sucursal_id) ?? "—",
      empleado: `${emp.apellido ?? ""}, ${emp.nombre ?? ""}`.trim(),
      ingreso: calc?.ingreso ? format(parseISO(calc.ingreso), "dd/MM/yyyy") : "—",
      total: calc?.dias ?? 0,
      tomados: 0,
      aprobadas: 0,
      pendientes: 0,
      restantes: 0,
      _consumidos: 0,
    });
  }

  for (const s of (solRes.data ?? []) as any[]) {
    const r = rows.get(s.empleado_id);
    if (!r) continue;
    const ini = parseISO(s.fecha_inicio + "T00:00:00");
    const fin = parseISO(s.fecha_fin + "T00:00:00");
    const dias = Math.max(1, differenceInCalendarDays(fin, ini) + 1);
    if (s.estado === "gozadas") { r.tomados += dias; r._consumidos += dias; }
    else if (s.estado === "aprobada") { r.aprobadas += dias; r._consumidos += dias; }
    else if (s.estado === "pendiente") { r.pendientes += dias; r._consumidos += dias; }
  }

  const out: Row[] = [];
  rows.forEach((r) => {
    r.restantes = r.total - r._consumidos;
    out.push({
      sucursal: r.sucursal,
      empleado: r.empleado,
      ingreso: r.ingreso,
      total: r.total,
      tomados: r.tomados,
      aprobadas: r.aprobadas,
      pendientes: r.pendientes,
      restantes: r.restantes,
    });
  });
  out.sort((a, b) =>
    a.sucursal.localeCompare(b.sucursal) || a.empleado.localeCompare(b.empleado)
  );
  return out;
}

function descargar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const HEADERS = ["Sucursal", "Empleado", "Ingreso", "Total", "Tomados", "Aprobadas por tomar", "Pendientes aprobación", "Restantes"];

function toMatrix(rows: Row[]) {
  return rows.map((r) => [r.sucursal, r.empleado, r.ingreso, r.total, r.tomados, r.aprobadas, r.pendientes, r.restantes]);
}

export function ResumenVacacionesExport() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [generando, setGenerando] = useState<null | "xlsx" | "pdf" | "csv">(null);

  const generar = async (tipo: "xlsx" | "pdf" | "csv") => {
    try {
      setGenerando(tipo);
      const anioNum = parseInt(anio, 10);
      if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
        toast({ title: "Año inválido", variant: "destructive" });
        return;
      }
      const rows = await armarResumen(anioNum);
      if (rows.length === 0) {
        toast({ title: "Sin datos para exportar", variant: "destructive" });
        return;
      }

      const nombreBase = `resumen_vacaciones_${anioNum}`;

      if (tipo === "csv") {
        const escape = (v: any) => {
          const s = String(v ?? "");
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [HEADERS.join(","), ...toMatrix(rows).map((r) => r.map(escape).join(","))];
        descargar(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${nombreBase}.csv`);
      } else if (tipo === "xlsx") {
        const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...toMatrix(rows)]);
        ws["!cols"] = [{ wch: 20 }, { wch: 32 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 22 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Vacaciones ${anioNum}`);
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        descargar(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${nombreBase}.xlsx`);
      } else {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.setTextColor(75, 13, 109);
        doc.text(`Resumen de Vacaciones ${anioNum}`, 40, 40);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 40, 56);

        autoTable(doc, {
          startY: 70,
          head: [HEADERS],
          body: toMatrix(rows).map((r) => r.map((v) => String(v))),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [75, 13, 109], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 240, 250] },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 7) {
              const val = Number(data.cell.raw);
              if (val < 0) {
                data.cell.styles.textColor = [200, 30, 30];
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
        });

        doc.save(`${nombreBase}.pdf`);
      }

      toast({ title: `Resumen ${tipo.toUpperCase()} generado` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al generar resumen", description: e.message, variant: "destructive" });
    } finally {
      setGenerando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Resumen anual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar resumen de vacaciones</DialogTitle>
          <DialogDescription>
            Elegí el año y el formato. Se excluyen cuentas demo y apellido "Soto".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="anio-resumen">Año</Label>
            <Input
              id="anio-resumen"
              type="number"
              min={2000}
              max={2100}
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={!!generando}
            onClick={() => generar("xlsx")}
          >
            {generando === "xlsx" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Excel
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!!generando}
            onClick={() => generar("pdf")}
          >
            {generando === "pdf" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            PDF
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!!generando}
            onClick={() => generar("csv")}
          >
            {generando === "csv" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
