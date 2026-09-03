import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Props {
  url: string | null;
  onClose: () => void;
}

export function FotoLightbox({ url, onClose }: Props) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-2 sm:p-4">
        <DialogTitle className="sr-only">Foto de evidencia</DialogTitle>
        {url && (
          <div className="space-y-2">
            <img
              src={url}
              alt="Foto de evidencia del control"
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir original
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
