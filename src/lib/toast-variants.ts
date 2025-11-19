import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { createElement } from "react";

// Toast helpers con iconos y colores consistentes
export const toastSuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    icon: createElement(CheckCircle2, { className: "h-4 w-4" }),
    className: "border-success/20 bg-success/10",
  });
};

export const toastError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    icon: createElement(XCircle, { className: "h-4 w-4" }),
    className: "border-error/20 bg-error/10",
  });
};

export const toastWarning = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    icon: createElement(AlertCircle, { className: "h-4 w-4" }),
    className: "border-warning/20 bg-warning/10",
  });
};

export const toastInfo = (message: string, description?: string) => {
  toast.info(message, {
    description,
    icon: createElement(Info, { className: "h-4 w-4" }),
    className: "border-info/20 bg-info/10",
  });
};

export const toastPromise = <T,>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(promise, {
    loading,
    success,
    error,
  });
};
