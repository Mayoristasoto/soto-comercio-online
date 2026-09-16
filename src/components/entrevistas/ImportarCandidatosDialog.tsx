import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { PuestoReclutamiento } from "./entrevistasTypes";

const db = supabase as any;

interface Fila {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  puesto: string;
}

const valor = (row: any, claves: string[]) => {
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().trim();
    if (claves.some((c) => norm === c || norm.includes(c))) return String(row[k] ?? "").trim();
  }
  return "";
};

export default function ImportarCandidatosDialog({
  puestos,
  onImportado,
}: {
  puestos: PuestoReclutamiento[];
  onImportado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [puestoDefault, setPuestoDefault] = useState("none");
  const [guardando, setGuardando] = useState(false);

  const leerArchivo = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const hoja = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });
      const parsed: Fila[] = rows
        .map((r) => ({
          nombre: valor(r, ["nombre"]),
          apellido: valor(r, ["apellido"]),
          telefono: valor(r, ["telefono", "teléfono", "celular", "tel"]),
          email: valor(r, ["email", "mail", "correo"]),
          puesto: valor(r, ["puesto", "categoria", "categoría", "cargo"]),
        }))
        .filter((f) => f.nombre || f.apellido);
      if (parsed.length === 0) {
        toast.error("No se encontraron candidatos en el archivo");
        return;
      }
      setFilas(parsed);
    } catch (e: any) {
      toast.error("No se pudo leer el archivo: " + (e.message || e));
    }
  };

  const confirmar = async () => {
    setGuardando(true);
    try {
      const porNombre = new Map(puestos.map((p) => [p.nombre.toLowerCase(), p.id]));
      const registros = filas.map((f) => {
        const clave = f.puesto.toLowerCase().trim();
        const encontrado =
          porNombre.get(clave) ||
          puestos.find((p) => clave && p.nombre.toLowerCase().startsWith(clave.slice(0, 4)))?.id ||
          (puestoDefault === "none" ? null : puestoDefault);
        return {
          nombre: f.nombre || f.apellido,
          apellido: f.apellido || null,
          telefono: f.telefono || null,
          email: f.email || null,
          puesto_id: encontrado,
          origen: "importacion",
        };
      });
      const { error } = await db.from("candidatos").insert(registros);
      if (error) throw error;
      toast.success(`${registros.length} candidatos importados`);
      setFilas([]);
      setAbierto(false);
      onImportado();
    } catch (e: any) {
      toast.error("No se pudo importar: " + (e.message || e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Importar Excel/CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar candidatos</DialogTitle>
          <DialogDescription>
            El archivo puede tener columnas Nombre, Apellido, Teléfono, Email y Puesto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Archivo</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Puesto si el archivo no lo indica</Label>
              <Select value={puestoDefault} onValueChange={setPuestoDefault}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin puesto</SelectItem>
                  {puestos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filas.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Vista previa · {filas.length} candidatos detectados
              </p>
              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Apellido</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Puesto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.slice(0, 50).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell>{f.nombre}</TableCell>
                        <TableCell>{f.apellido}</TableCell>
                        <TableCell>{f.telefono}</TableCell>
                        <TableCell>{f.email}</TableCell>
                        <TableCell>{f.puesto}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={confirmar} disabled={guardando}>
                {guardando ? "Importando…" : `Importar ${filas.length} candidatos`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
