import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ListChecks,
  Package,
  Palmtree,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { CATALOGO_CONTROLES, getPanelBase } from "@/lib/controlesCatalogo";
import { usePanelControles } from "@/hooks/usePanelControles";

const ICONS: Record<string, LucideIcon> = {
  ClipboardCheck,
  ListChecks,
  Package,
  AlertTriangle,
  CalendarRange,
  Palmtree,
  Calendar,
  FileText,
  LayoutDashboard,
  Boxes,
  Activity,
};

export default function ControlesDashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = getPanelBase(pathname);
  const [userId, setUserId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { claves, toggle, mover } = usePanelControles(userId);
  const seleccionadas = claves
    .map((c) => CATALOGO_CONTROLES.find((s) => s.clave === c))
    .filter((s): s is (typeof CATALOGO_CONTROLES)[number] => Boolean(s));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Mi panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elegí las secciones que querés tener a mano. La configuración es tuya.
          </p>
        </div>
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              Personalizar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Personalizar mi panel</DialogTitle>
              <DialogDescription>
                Activá las secciones que querés ver y ordenalas con las flechas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {CATALOGO_CONTROLES.map((s) => {
                const activa = claves.includes(s.clave);
                return (
                  <div
                    key={s.clave}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.descripcion}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {activa && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => mover(s.clave, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => mover(s.clave, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Switch checked={activa} onCheckedChange={() => toggle(s.clave)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {seleccionadas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Todavía no elegiste secciones. Toca “Personalizar” para armar tu panel.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {seleccionadas.map((s) => {
            const Icon = ICONS[s.icon] ?? LayoutDashboard;
            return (
              <Card
                key={s.clave}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate(s.url)}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">{s.titulo}</h2>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.descripcion}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
