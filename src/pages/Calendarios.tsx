import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCalendariosData } from "@/hooks/useCalendariosData";
import { CalendarioSidebar } from "@/components/calendarios/CalendarioSidebar";
import { VistaMes } from "@/components/calendarios/VistaMes";
import { AgendaProxima } from "@/components/calendarios/AgendaProxima";
import { CalendarioDialog } from "@/components/calendarios/CalendarioDialog";
import { CompartirCalendarioDialog } from "@/components/calendarios/CompartirCalendarioDialog";
import { EventoDialog } from "@/components/calendarios/EventoDialog";
import { Calendario, EventoUnificado, deleteCalendario } from "@/lib/calendariosService";

export default function Calendarios() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mes, setMes] = useState(new Date());
  const [tab, setTab] = useState<"mes" | "agenda">("mes");

  const rango = useMemo(() => {
    const ini = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    return { desde: ini, hasta: fin };
  }, [mes]);

  const {
    rol,
    calendarios,
    activos,
    eventos,
    loading,
    toggleCalendario,
    refreshCalendarios,
    refreshEventos,
  } = useCalendariosData(rango.desde, rango.hasta);

  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [editandoCal, setEditandoCal] = useState<Calendario | null>(null);
  const [shareCal, setShareCal] = useState<Calendario | null>(null);
  const [eventoDialogOpen, setEventoDialogOpen] = useState(false);
  const [editandoEvento, setEditandoEvento] = useState<EventoUnificado | null>(null);
  const [fechaNuevo, setFechaNuevo] = useState<Date | undefined>();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate("/auth");
    })();
  }, [navigate]);

  const isAdmin = rol === "admin_rrhh";

  const handleClickEvento = (ev: EventoUnificado) => {
    if (ev.source === "virtual") {
      toast({ title: ev.titulo, description: format(ev.fecha_inicio, "PPP", { locale: es }) });
      return;
    }
    setEditandoEvento(ev);
    setFechaNuevo(undefined);
    setEventoDialogOpen(true);
  };

  const handleClickDia = (d: Date) => {
    if (!isAdmin) return;
    setEditandoEvento(null);
    setFechaNuevo(d);
    setEventoDialogOpen(true);
  };

  const handleEliminar = async (cal: Calendario) => {
    if (!confirm(`¿Eliminar el calendario "${cal.nombre}"? Sus eventos también se eliminarán.`)) return;
    try {
      await deleteCalendario(cal.id);
      toast({ title: "Calendario eliminado" });
      refreshCalendarios();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendarios</h1>
          <p className="text-xs text-muted-foreground">
            Eventos, deadlines, vacaciones y cumpleaños en un mismo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMes(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMes((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-medium capitalize min-w-[10ch] text-center">
            {format(mes, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMes((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <CalendarioSidebar
          calendarios={calendarios}
          activos={activos}
          isAdmin={isAdmin}
          onToggle={toggleCalendario}
          onCrearCalendario={() => { setEditandoCal(null); setCalDialogOpen(true); }}
          onEditar={(c) => { setEditandoCal(c); setCalDialogOpen(true); }}
          onCompartir={(c) => setShareCal(c)}
          onEliminar={handleEliminar}
          onCrearEvento={() => { setEditandoEvento(null); setFechaNuevo(new Date()); setEventoDialogOpen(true); }}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1 overflow-hidden">
            <div className="border-b px-4 pt-2">
              <TabsList>
                <TabsTrigger value="mes">Mes</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="mes" className="flex-1 overflow-hidden m-0 relative">
              {loading && (
                <div className="absolute top-2 right-4 z-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <VistaMes
                mes={mes}
                eventos={eventos}
                onClickEvento={handleClickEvento}
                onClickDia={handleClickDia}
              />
            </TabsContent>
            <TabsContent value="agenda" className="flex-1 overflow-auto m-0">
              <AgendaProxima eventos={eventos} onClickEvento={handleClickEvento} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CalendarioDialog
        open={calDialogOpen}
        onOpenChange={setCalDialogOpen}
        calendario={editandoCal}
        onSaved={refreshCalendarios}
      />
      <CompartirCalendarioDialog
        open={!!shareCal}
        onOpenChange={(v) => !v && setShareCal(null)}
        calendario={shareCal}
      />
      <EventoDialog
        open={eventoDialogOpen}
        onOpenChange={setEventoDialogOpen}
        calendarios={calendarios}
        evento={editandoEvento}
        fechaInicial={fechaNuevo}
        onSaved={refreshEventos}
      />
    </div>
  );
}
