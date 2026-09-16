import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck } from "lucide-react";
import { useEsRRHH } from "@/hooks/useEsRRHH";
import AgendaEntrevistas from "@/components/entrevistas/AgendaEntrevistas";
import ConfiguracionDisponibilidad from "@/components/entrevistas/ConfiguracionDisponibilidad";
import CandidatosLista from "@/components/entrevistas/CandidatosLista";
import InvitacionesPendientes from "@/components/entrevistas/InvitacionesPendientes";

export default function Entrevistas() {
  const { esRRHH, loading } = useEsRRHH();
  const [refrescar, setRefrescar] = useState(0);
  const soloLectura = !esRRHH;

  const recargar = () => setRefrescar((n) => n + 1);

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CalendarCheck className="h-6 w-6 text-primary" /> Entrevistas
        </h1>
        <p className="text-muted-foreground">
          Agenda de entrevistas, disponibilidad e invitaciones a candidatos.
          {!loading && soloLectura && " Estás viendo la agenda en modo consulta."}
        </p>
      </header>

      <Tabs defaultValue="agenda">
        <TabsList className="flex-wrap">
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
          <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
          <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <AgendaEntrevistas soloLectura={soloLectura} refrescar={refrescar} />
        </TabsContent>
        <TabsContent value="disponibilidad" className="mt-4">
          <ConfiguracionDisponibilidad soloLectura={soloLectura} onCambio={recargar} />
        </TabsContent>
        <TabsContent value="candidatos" className="mt-4">
          <CandidatosLista soloLectura={soloLectura} onInvitado={recargar} />
        </TabsContent>
        <TabsContent value="invitaciones" className="mt-4">
          <InvitacionesPendientes soloLectura={soloLectura} refrescar={refrescar} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
