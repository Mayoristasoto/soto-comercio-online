import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UseConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "success" | "warning";
}

export function useConfirm() {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);
  const [options, setOptions] = useState<UseConfirmOptions>({
    title: "",
  });

  const confirm = (opts: UseConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise((resolve) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDialog = () => (
    <ConfirmDialog
      open={promise !== null}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      variant={options.variant}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmationDialog };
}
