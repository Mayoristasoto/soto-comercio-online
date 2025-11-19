import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { CheckCircle2, XCircle, Clock, AlertCircle, Info } from "lucide-react";

type StatusType = "success" | "error" | "warning" | "pending" | "info" | "neutral";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  icon?: LucideIcon;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  {
    className: string;
    icon: LucideIcon;
    defaultLabel: string;
  }
> = {
  success: {
    className: "badge-success",
    icon: CheckCircle2,
    defaultLabel: "Activo",
  },
  error: {
    className: "badge-error",
    icon: XCircle,
    defaultLabel: "Error",
  },
  warning: {
    className: "badge-warning",
    icon: AlertCircle,
    defaultLabel: "Advertencia",
  },
  pending: {
    className: "badge-warning",
    icon: Clock,
    defaultLabel: "Pendiente",
  },
  info: {
    className: "badge-info",
    icon: Info,
    defaultLabel: "Información",
  },
  neutral: {
    className: "badge-neutral",
    icon: Info,
    defaultLabel: "Neutral",
  },
};

export function StatusBadge({ 
  status, 
  label, 
  icon, 
  className = "" 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = icon || config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <span className={`${config.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {displayLabel}
    </span>
  );
}

// Variantes específicas para casos comunes
export function ActiveBadge({ active = true }: { active?: boolean }) {
  return (
    <StatusBadge
      status={active ? "success" : "error"}
      label={active ? "Activo" : "Inactivo"}
    />
  );
}

export function ApprovalBadge({ 
  approved, 
  pending = false 
}: { 
  approved?: boolean; 
  pending?: boolean; 
}) {
  if (pending) {
    return <StatusBadge status="pending" label="Pendiente" />;
  }
  return (
    <StatusBadge
      status={approved ? "success" : "error"}
      label={approved ? "Aprobado" : "Rechazado"}
    />
  );
}

export function CompletionBadge({ completed = false }: { completed?: boolean }) {
  return (
    <StatusBadge
      status={completed ? "success" : "pending"}
      label={completed ? "Completado" : "Pendiente"}
    />
  );
}
