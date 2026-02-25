import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Pencil } from "lucide-react";

interface FormState {
  vigencia_desde: string;
  vigencia_hasta: string;
  tipo_regimen: string;
  alicuota_jubilacion: string;
  alicuota_obra_social: string;
  alicuota_ley19032: string;
  alicuota_art: string;
  tope_base: string;
  descripcion: string;
}

const emptyForm: FormState = {
  vigencia_desde: new Date().toISOString().slice(0, 10),
  vigencia_hasta: "",
  tipo_regimen: "general",
  alicuota_jubilacion: "10.17",
  alicuota_obra_social: "6.00",
  alicuota_ley19032: "1.50",
  alicuota_art: "2.50",
  tope_base: "",
  descripcion: "",
};

export default function ParametrosCargasSociales() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: parametros, isLoading } = useQuery({
    queryKey: ["parametros_cargas_sociales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros_cargas_sociales")
        .select("*")
        .order("vigencia_desde", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        vigencia_desde: form.vigencia_desde,
        vigencia_hasta: form.vigencia_hasta || null,
        tipo_regimen: form.tipo_regimen,
        alicuota_jubilacion: parseFloat(form.alicuota_jubilacion) || 0,
        alicuota_obra_social: parseFloat(form.alicuota_obra_social) || 0,
        alicuota_ley19032: parseFloat(form.alicuota_ley19032) || 0,
        alicuota_art: parseFloat(form.alicuota_art) || 0,
        tope_base: form.tope_base ? parseFloat(form.tope_base) : null,
        descripcion: form.descripcion || null,
      };
      if (editId) {
        const { error } = await supabase.from("parametros_cargas_sociales").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("parametros_cargas_sociales").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parametros_cargas_sociales"] });
      toast.success(editId ? "Parámetros actualizados" : "Parámetros creados");
      closeDialog();
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      vigencia_desde: p.vigencia_desde,
      vigencia_hasta: p.vigencia_hasta || "",
      tipo_regimen: p.tipo_regimen,
      alicuota_jubilacion: String(p.alicuota_jubilacion),
      alicuota_obra_social: String(p.alicuota_obra_social),
      alicuota_ley19032: String(p.alicuota_ley19032),
      alicuota_art: String(p.alicuota_art),
      tope_base: p.tope_base ? String(p.tope_base) : "",
      descripcion: p.descripcion || "",
    });
    setDialogOpen(true);
  };

  const totalAlicuota = (p: any) =>
    (Number(p.alicuota_jubilacion) + Number(p.alicuota_obra_social) + Number(p.alicuota_ley19032) + Number(p.alicuota_art)).toFixed(2);

  const set = (key: keyof FormState, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Parámetros de Cargas Sociales
          </CardTitle>
          <CardDescription>Alícuotas patronales parametrizables por vigencia</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Crear"} Parámetros</DialogTitle>
              <DialogDescription>Configure las alícuotas patronales</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vigencia desde</Label>
                  <Input type="date" value={form.vigencia_desde} onChange={(e) => set("vigencia_desde", e.target.value)} />
                </div>
                <div>
                  <Label>Vigencia hasta (opcional)</Label>
                  <Input type="date" value={form.vigencia_hasta} onChange={(e) => set("vigencia_hasta", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Tipo de Régimen</Label>
                <Input value={form.tipo_regimen} onChange={(e) => set("tipo_regimen", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jubilación (%)</Label>
                  <Input type="number" step="0.01" value={form.alicuota_jubilacion} onChange={(e) => set("alicuota_jubilacion", e.target.value)} />
                </div>
                <div>
                  <Label>Obra Social (%)</Label>
                  <Input type="number" step="0.01" value={form.alicuota_obra_social} onChange={(e) => set("alicuota_obra_social", e.target.value)} />
                </div>
                <div>
                  <Label>Ley 19.032 (%)</Label>
                  <Input type="number" step="0.01" value={form.alicuota_ley19032} onChange={(e) => set("alicuota_ley19032", e.target.value)} />
                </div>
                <div>
                  <Label>ART (%)</Label>
                  <Input type="number" step="0.01" value={form.alicuota_art} onChange={(e) => set("alicuota_art", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Tope base imponible (opcional)</Label>
                <Input type="number" step="0.01" value={form.tope_base} onChange={(e) => set("tope_base", e.target.value)} placeholder="Sin tope" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Ej: Régimen general 2025" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={() => guardar.mutate()} disabled={!form.vigencia_desde || guardar.isPending}>
                {guardar.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Cargando parámetros...</p>
        ) : !parametros?.length ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No hay parámetros configurados. Cree el primero con las alícuotas vigentes.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Régimen</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Jubilación</TableHead>
                <TableHead className="text-right">O.Social</TableHead>
                <TableHead className="text-right">Ley 19032</TableHead>
                <TableHead className="text-right">ART</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parametros.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant="outline">{p.tipo_regimen}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.vigencia_desde} → {p.vigencia_hasta || "vigente"}
                  </TableCell>
                  <TableCell className="text-right">{p.alicuota_jubilacion}%</TableCell>
                  <TableCell className="text-right">{p.alicuota_obra_social}%</TableCell>
                  <TableCell className="text-right">{p.alicuota_ley19032}%</TableCell>
                  <TableCell className="text-right">{p.alicuota_art}%</TableCell>
                  <TableCell className="text-right font-bold">{totalAlicuota(p)}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
