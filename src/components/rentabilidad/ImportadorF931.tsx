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
import { Upload, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import * as XLSX from "xlsx";

export default function ImportadorF931() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const importar = useMutation({
    mutationFn: async (file: File) => {
      if (!periodoId) throw new Error("Seleccione un período");
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) throw new Error("Archivo vacío");

      const inserts = rows.map((row) => {
        const cuil = String(row.CUIL || row.cuil || row.Cuil || "").replace(/[-\s]/g, "");
        const emp = empleados?.find((e) => e.cuil?.replace(/[-\s]/g, "") === cuil);

        const datos: Record<string, any> = {};
        const errores: string[] = [];

        // Map common F931 columns
        for (const [key, val] of Object.entries(row)) {
          datos[key] = val;
        }

        if (!cuil) errores.push("CUIL vacío");
        if (!emp) errores.push("Empleado no encontrado");

        return {
          periodo_id: periodoId,
          cuil,
          empleado_id: emp?.id || null,
          datos_importados: datos,
          archivo_origen: file.name,
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
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importar.mutate(file);
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
            <Label>Archivo CSV/Excel</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              disabled={!periodoId || importar.isPending}
              className="block text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
        </div>

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
