import { useState } from "react";
import { Check, ChevronsUpDown, Layers, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePerfilesVista } from "@/hooks/usePerfilesVista";

interface Props {
  userId?: string | null;
  compacto?: boolean;
}

export function SelectorPerfilVista({ userId, compacto }: Props) {
  const { perfiles, activo, aplicarPerfil, guardarComoPerfil, actualizarPerfil, setDefault } =
    usePerfilesVista(userId);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [nombre, setNombre] = useState("");

  if (!userId) return null;

  const guardar = async () => {
    const n = nombre.trim();
    if (!n) return;
    const perfil = await guardarComoPerfil(n);
    if (perfil) {
      setDialogAbierto(false);
      setNombre("");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Layers className="h-4 w-4" />
            {!compacto && (
              <span className="max-w-[120px] truncate text-sm">
                {activo ? activo.nombre : "Mi vista"}
              </span>
            )}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Perfiles de vista</DropdownMenuLabel>
          {perfiles.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              Todavía no guardaste ningún perfil.
            </div>
          )}
          {perfiles.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => aplicarPerfil(p.id)} className="gap-2">
              <Check className={`h-4 w-4 ${activo?.id === p.id ? "opacity-100" : "opacity-0"}`} />
              <span className="flex-1 truncate">{p.nombre}</span>
              {p.es_default && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {activo && (
            <DropdownMenuItem onClick={() => actualizarPerfil(activo.id)} className="gap-2">
              <Save className="h-4 w-4" />
              Guardar cambios en "{activo.nombre}"
            </DropdownMenuItem>
          )}
          {activo && !activo.es_default && (
            <DropdownMenuItem onClick={() => setDefault(activo.id)} className="gap-2">
              <Star className="h-4 w-4" />
              Hacer predeterminado
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDialogAbierto(true)} className="gap-2">
            <Layers className="h-4 w-4" />
            Guardar vista actual como perfil...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar vista actual como perfil</DialogTitle>
            <DialogDescription>
              Se guarda tu disposición actual: menú, accesos rápidos, capas del calendario, vista de
              navegación y tema.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder='Ej: "Cierre de mes", "Liquidación"'
            onKeyDown={(e) => e.key === "Enter" && guardar()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={!nombre.trim()}>
              Guardar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
