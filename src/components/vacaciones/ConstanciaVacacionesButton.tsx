import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  imprimirConstanciaVacaciones,
  TipoConstancia,
} from "@/utils/constanciaVacacionesPDF";

interface Props {
  solicitudId: string;
  tipo: TipoConstancia;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function ConstanciaVacacionesButton({
  solicitudId,
  tipo,
  label,
  size = "sm",
  variant = "outline",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    try {
      setLoading(true);
      await imprimirConstanciaVacaciones(tipo, solicitudId);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error al generar constancia",
        description: e.message ?? "Reintentá en unos segundos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultLabel =
    tipo === "vacaciones_otorgamiento"
      ? "Constancia Otorgamiento"
      : "Constancia Goce";

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Printer className="h-3 w-3 mr-1" />
      )}
      {label ?? defaultLabel}
    </Button>
  );
}
