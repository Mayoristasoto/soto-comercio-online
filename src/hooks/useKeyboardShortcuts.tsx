import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignorar si está escribiendo en un input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const matchedShortcut = shortcuts.find((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.action();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// Componente de ayuda de atajos
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShortcutsHelpProps {
  shortcuts: Shortcut[];
}

export function ShortcutsHelp({ shortcuts }: ShortcutsHelpProps) {
  const [open, setOpen] = useState(false);

  // Agrupar por categoría
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || "General";
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const formatShortcut = (shortcut: Shortcut) => {
    const keys = [];
    if (shortcut.ctrl) keys.push("⌘");
    if (shortcut.shift) keys.push("⇧");
    if (shortcut.alt) keys.push("⌥");
    keys.push(shortcut.key.toUpperCase());
    return keys.join(" + ");
  };

  // Atajo para abrir la ayuda (?)
  useKeyboardShortcuts([
    {
      key: "?",
      shift: true,
      action: () => setOpen(true),
      description: "Mostrar atajos de teclado",
    },
  ]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Atajos de teclado (Shift + ?)"
      >
        <Keyboard className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Atajos de Teclado
            </DialogTitle>
            <DialogDescription>
              Usa estos atajos para navegar más rápido
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono">
                        {formatShortcut(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
