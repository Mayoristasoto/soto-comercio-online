import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, CheckCircle, Info } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive" | "success" | "warning";
  loading?: boolean;
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-primary",
    confirmVariant: "default" as const,
  },
  destructive: {
    icon: Trash2,
    iconColor: "text-error",
    confirmVariant: "destructive" as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-success",
    confirmVariant: "default" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-warning",
    confirmVariant: "default" as const,
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-3 bg-muted ${config.iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-2">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-sm">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-error hover:bg-error/90 text-error-foreground"
                : ""
            }
          >
            {loading ? "Procesando..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
