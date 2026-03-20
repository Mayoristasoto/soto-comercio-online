import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertTriangle, XCircle, FileText, Loader2, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";

interface OcrRow {
  cuil: string;
  apellido: string;
  nombre: string;
  remuneracion?: number;
  aportes?: number;
  contribuciones?: number;
}

interface F931Summary {
  cant_empleados: number;
  remuneracion_total: number;
  aportes_ss?: number;
  contribuciones_ss?: number;
  aportes_os?: number;
  contribuciones_os?: number;
  lrt?: number;
}

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

export default function ImportadorF931() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrRows, setOcrRows] = useState<OcrRow[] | null>(null);
  const [ocrSummary, setOcrSummary] = useState<F931Summary | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrFileName, setOcrFileName] = useState("");

  const { data: periodos } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data } = await supabase.from("periodos_contables").select("*").order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: empleados } = useQuery({
    queryKey: ["empleados_cuil"],
    queryFn: async () => {
      const { data } = await supabase.from("empleados").select("id, nombre, apellido, cuil").is("fecha_baja", null);
      return data || [];
    },
  });

  const { data: registros, isLoading } = useQuery({
    queryKey: ["importacion_f931", periodoId],
    queryFn: async () => {
      if (!periodoId) return [];
      const { data } = await supabase
        .from("importacion_f931")
        .select("*, empleados(nombre, apellido)")
        .eq("periodo_id", periodoId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!periodoId,
  });

  // Check if current period already has F931 summary data
  const selectedPeriodo = periodos?.find((p) => p.id === periodoId);
  const hasF931Data = selectedPeriodo && (selectedPeriodo as any).f931_remuneracion_total != null;

  // Mutation for inserting detail rows
  const insertRows = useMutation({
    mutationFn: async ({ rows, fileName }: { rows: any[]; fileName: string }) => {
      const inserts = rows.map((row) => {
        const cuil = String(row.CUIL || row.cuil || row.Cuil || "").replace(/[-\s]/g, "");
        const emp = empleados?.find((e) => e.cuil?.replace(/[-\s]/g, "") === cuil);
        const datos: Record<string, any> = {};
        const errores: string[] = [];
        for (const [key, val] of Object.entries(row)) datos[key] = val;
        if (!cuil) errores.push("CUIL vacío");
        if (!emp) errores.push("Empleado no encontrado");
        return {
          periodo_id: periodoId,
          cuil,
          empleado_id: emp?.id || null,
          datos_importados: datos,
          archivo_origen: fileName,
          estado: emp ? "mapeado" : "sin_mapear",
          errores: errores.length ? errores : null,
          validado: false,
        };
      });
      const { error } = await supabase.from("importacion_f931").insert(inserts);
      if (error) throw error;
      return { total: inserts.length, mapeados: inserts.filter((i) => i.estado === "mapeado").length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["importacion_f931"] });
      toast({ title: "Importación exitosa", description: `${res.total} registros importados, ${res.mapeados} mapeados por CUIL` });
      resetFileState();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Mutation for saving F931 summary to periodos_contables
  const saveSummary = useMutation({
    mutationFn: async (summary: F931Summary) => {
      const { error } = await supabase
        .from("periodos_contables")
        .update({
          f931_cant_empleados: summary.cant_empleados,
          f931_remuneracion_total: summary.remuneracion_total,
          f931_aportes_ss: summary.aportes_ss || 0,
          f931_contribuciones_ss: summary.contribuciones_ss || 0,
          f931_aportes_os: summary.aportes_os || 0,
          f931_contribuciones_os: summary.contribuciones_os || 0,
          f931_lrt: summary.lrt || 0,
          f931_importado_at: new Date().toISOString(),
        } as any)
        .eq("id", periodoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periodos_contables"] });
      toast({ title: "Totales F931 guardados", description: "Los totales del F931 fueron asociados al período contable para validación cruzada." });
      resetFileState();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetFileState = () => {
    setOcrRows(null);
    setOcrSummary(null);
    setOcrFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !periodoId) return;

    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setOcrProcessing(true);
      setOcrFileName(file.name);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const { data, error } = await supabase.functions.invoke("ocr-f931", {
          body: { pdf_base64: base64 },
        });

        if (error) throw new Error(error.message || "Error procesando OCR");
        if (data?.error) throw new Error(data.error);

        if (data?.type === "summary") {
          setOcrSummary(data.summary);
          setOcrRows(null);
          toast({ title: "F931 Resumen detectado", description: "Se extrajeron los totales globales. Revisá y confirmá." });
        } else {
          const registros = data?.registros || [];
          if (!registros.length) {
            toast({ title: "Sin resultados", description: "No se pudieron extraer registros del PDF.", variant: "destructive" });
            return;
          }
          setOcrRows(registros);
          setOcrSummary(null);
          toast({ title: "OCR completado", description: `${registros.length} registros extraídos. Revisá y confirmá.` });
        }
      } catch (err: any) {
        toast({ title: "Error OCR", description: err.message, variant: "destructive" });
        resetFileState();
      } finally {
        setOcrProcessing(false);
      }
    } else {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!rows.length) {
          toast({ title: "Error", description: "Archivo vacío", variant: "destructive" });
          return;
        }
        insertRows.mutate({ rows, fileName: file.name });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleConfirmOcr = () => {
    if (!ocrRows || !periodoId) return;
    const rows = ocrRows.map((r) => ({
      CUIL: r.cuil,
      Apellido: r.apellido,
      Nombre: r.nombre,
      Remuneracion: r.remuneracion || 0,
      Aportes: r.aportes || 0,
      Contribuciones: r.contribuciones || 0,
    }));
    insertRows.mutate({ rows, fileName: ocrFileName });
  };

  const handleConfirmSummary = () => {
    if (!ocrSummary || !periodoId) return;
    saveSummary.mutate(ocrSummary);
  };

  const totalMapeados = registros?.filter((r) => r.estado === "mapeado").length || 0;
  const totalSinMapear = registros?.filter((r) => r.estado === "sin_mapear").length || 0;
  const totalValidados = registros?.filter((r) => r.validado).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importador F931
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-48">
            <Label>Período</Label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {periodos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.fecha_inicio} → {p.fecha_fin}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Archivo CSV/Excel/PDF</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={handleFile}
              disabled={!periodoId || insertRows.isPending || ocrProcessing || saveSummary.isPending}
              className="block text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
          {ocrProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando OCR...
            </div>
          )}
        </div>

        {/* F931 Summary already saved indicator */}
        {hasF931Data && (
          <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Totales F931 importados para este período</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>Empleados: <strong>{(selectedPeriodo as any).f931_cant_empleados}</strong></div>
                <div>Remuneración: <strong>{fmt(Number((selectedPeriodo as any).f931_remuneracion_total) || 0)}</strong></div>
                <div>Aportes SS: <strong>{fmt(Number((selectedPeriodo as any).f931_aportes_ss) || 0)}</strong></div>
                <div>Contrib. SS: <strong>{fmt(Number((selectedPeriodo as any).f931_contribuciones_ss) || 0)}</strong></div>
                <div>Aportes OS: <strong>{fmt(Number((selectedPeriodo as any).f931_aportes_os) || 0)}</strong></div>
                <div>Contrib. OS: <strong>{fmt(Number((selectedPeriodo as any).f931_contribuciones_os) || 0)}</strong></div>
                <div>LRT: <strong>{fmt(Number((selectedPeriodo as any).f931_lrt) || 0)}</strong></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* OCR Summary Preview */}
        {ocrSummary && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Vista previa — Totales F931 extraídos de "{ocrFileName}"
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryItem label="Empleados" value={String(ocrSummary.cant_empleados)} />
                <SummaryItem label="Remuneración Total" value={fmt(ocrSummary.remuneracion_total)} />
                <SummaryItem label="Aportes SS" value={fmt(ocrSummary.aportes_ss || 0)} />
                <SummaryItem label="Contribuciones SS" value={fmt(ocrSummary.contribuciones_ss || 0)} />
                <SummaryItem label="Aportes OS" value={fmt(ocrSummary.aportes_os || 0)} />
                <SummaryItem label="Contribuciones OS" value={fmt(ocrSummary.contribuciones_os || 0)} />
                <SummaryItem label="LRT" value={fmt(ocrSummary.lrt || 0)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConfirmSummary} disabled={saveSummary.isPending} size="sm">
                  {saveSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Guardar en período
                </Button>
                <Button variant="outline" size="sm" onClick={resetFileState}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* OCR Detail Preview */}
        {ocrRows && ocrRows.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Vista previa OCR — {ocrRows.length} registros extraídos de "{ocrFileName}"
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CUIL</TableHead>
                      <TableHead>Apellido</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Remuneración</TableHead>
                      <TableHead className="text-right">Aportes</TableHead>
                      <TableHead className="text-right">Contribuciones</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocrRows.map((r, i) => {
                      const cleanCuil = r.cuil?.replace(/[-\s]/g, "") || "";
                      const matched = empleados?.find((e) => e.cuil?.replace(/[-\s]/g, "") === cleanCuil);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{r.cuil}</TableCell>
                          <TableCell>{r.apellido}</TableCell>
                          <TableCell>{r.nombre}</TableCell>
                          <TableCell className="text-right">{r.remuneracion?.toLocaleString("es-AR", { minimumFractionDigits: 2 }) || "-"}</TableCell>
                          <TableCell className="text-right">{r.aportes?.toLocaleString("es-AR", { minimumFractionDigits: 2 }) || "-"}</TableCell>
                          <TableCell className="text-right">{r.contribuciones?.toLocaleString("es-AR", { minimumFractionDigits: 2 }) || "-"}</TableCell>
                          <TableCell>
                            {matched ? (
                              <Badge variant="default" className="text-xs">✓ {matched.apellido}</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Sin match</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConfirmOcr} disabled={insertRows.isPending} size="sm">
                  {insertRows.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Confirmar importación
                </Button>
                <Button variant="outline" size="sm" onClick={resetFileState}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {registros && registros.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Mapeados: <strong>{totalMapeados}</strong>
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" /> Sin mapear: <strong>{totalSinMapear}</strong>
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Validados: <strong>{totalValidados}</strong>
            </span>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CUIL</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Validado</TableHead>
              <TableHead>Errores</TableHead>
              <TableHead>Archivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !periodoId ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Seleccione un período</TableCell></TableRow>
            ) : !registros?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin importaciones</TableCell></TableRow>
            ) : registros.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.cuil}</TableCell>
                <TableCell>{r.empleados ? `${r.empleados.apellido}, ${r.empleados.nombre}` : <span className="text-muted-foreground italic">No encontrado</span>}</TableCell>
                <TableCell>
                  <Badge variant={r.estado === "mapeado" ? "default" : "destructive"}>
                    {r.estado === "mapeado" ? "Mapeado" : "Sin mapear"}
                  </Badge>
                </TableCell>
                <TableCell>{r.validado ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{r.errores?.join(", ") || "-"}</TableCell>
                <TableCell className="text-xs">{r.archivo_origen || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
