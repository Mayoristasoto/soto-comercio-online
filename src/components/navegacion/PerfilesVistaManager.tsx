import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, Star, Copy, Trash2, Pencil, Save, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  usePerfilesVista,
  getMenuOcultos,
  setMenuOcultosStorage,
} from "@/hooks/usePerfilesVista";
import { toast } from "sonner";

interface Props {
  userId?: string | null;
  userRole?: string | null;
}

interface PaginaMenu {
  id: string;
  nombre: string;
  path: string;
  parent_id: string | null;
  orden: number;
}

export function PerfilesVistaManager({ userId, userRole }: Props) {
  const {
    perfiles,
    activo,
    aplicarPerfil,
    guardarComoPerfil,
    actualizarPerfil,
    renombrar,
    duplicar,
    borrar,
    setDefault,
  } = usePerfilesVista(userId);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");

  // Editor de visibilidad del menú (personal, por usuario)
  const [paginas, setPaginas] = useState<PaginaMenu[]>([]);
  const [ocultos, setOcultos] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    setOcultos(getMenuOcultos(userId));
  }, [userId]);

  useEffect(() => {
    if (!userRole) return;
    const cargar = async () => {
      const { data } = await supabase
        .from("app_pages")
        .select("id, nombre, path, parent_id, orden")
        .eq("visible", true)
        .eq("mostrar_en_sidebar", true)
        .contains("roles_permitidos", [userRole])
        .order("orden", { ascending: true });
      setPaginas((data as PaginaMenu[]) || []);
    };
    cargar();
  }, [userRole]);

  const toggleOculto = (path: string) => {
    if (!userId) return;
    const next = ocultos.includes(path) ? ocultos.filter((p) => p !== path) : [...ocultos, path];
    setOcultos(next);
    setMenuOcultosStorage(userId, next);
  };

  const guardarNuevo = async () => {
    const n = nuevoNombre.trim();
    if (!n) return;
    const perfil = await guardarComoPerfil(n);
    if (perfil) setNuevoNombre("");
  };

  const confirmarRenombre = async () => {
    if (!editandoId || !nombreEdicion.trim()) return;
    await renombrar(editandoId, nombreEdicion.trim());
    setEditandoId(null);
  };

  return (
    <div className="space-y-6">
      {/* Perfiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Mis perfiles de vista
          </CardTitle>
          <CardDescription>
            Guardá tu disposición actual (menú, accesos rápidos, calendario, tema) como un perfil y
            cambiá de uno a otro según la tarea. El predeterminado se aplica solo al iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder='Nombre del nuevo perfil (ej: "Cierre de mes")'
              onKeyDown={(e) => e.key === "Enter" && guardarNuevo()}
            />
            <Button onClick={guardarNuevo} disabled={!nuevoNombre.trim()} className="shrink-0">
              <Save className="mr-2 h-4 w-4" />
              Guardar actual
            </Button>
          </div>

          {perfiles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no tenés perfiles. Guardá el primero con tu vista actual.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {perfiles.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 p-3">
                  {editandoId === p.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={nombreEdicion}
                        onChange={(e) => setNombreEdicion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmarRenombre()}
                        autoFocus
                      />
                      <Button size="sm" onClick={confirmarRenombre}>
                        OK
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{p.nombre}</span>
                      {p.es_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current" /> Predeterminado
                        </Badge>
                      )}
                      {activo?.id === p.id && <Badge>Activo</Badge>}
                      <div className="flex items-center gap-1">
                        {activo?.id !== p.id && (
                          <Button size="sm" variant="outline" onClick={() => aplicarPerfil(p.id)}>
                            Aplicar
                          </Button>
                        )}
                        {activo?.id === p.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Pisar el perfil con tu vista actual"
                            onClick={() => actualizarPerfil(p.id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                        {!p.es_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Hacer predeterminado"
                            onClick={() => setDefault(p.id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Renombrar"
                          onClick={() => {
                            setEditandoId(p.id);
                            setNombreEdicion(p.nombre);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Duplicar (backup)"
                          onClick={() => duplicar(p.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Borrar"
                          onClick={() => {
                            if (window.confirm(`¿Borrar el perfil "${p.nombre}"?`)) borrar(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibilidad del menú */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Menu className="h-5 w-5" />
            Mi menú lateral
          </CardTitle>
          <CardDescription>
            Elegí qué secciones querés ver en tu menú. Es personal: no cambia el menú de nadie más.
            Al guardar un perfil se guarda también esta selección.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {paginas.map((pag) => {
              const visible = !ocultos.includes(pag.path);
              return (
                <div
                  key={pag.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <Label
                    htmlFor={`menu-${pag.id}`}
                    className={`flex-1 cursor-pointer text-sm ${visible ? "" : "text-muted-foreground line-through"}`}
                  >
                    {pag.nombre}
                  </Label>
                  <Switch
                    id={`menu-${pag.id}`}
                    checked={visible}
                    onCheckedChange={() => toggleOculto(pag.path)}
                  />
                </div>
              );
            })}
          </div>
          {paginas.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay secciones disponibles.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Los cambios se ven al recargar o cambiar de pantalla.{" "}
            <button
              className="underline"
              onClick={() => {
                toast.success("Menú actualizado");
                window.location.reload();
              }}
            >
              Recargar ahora
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
