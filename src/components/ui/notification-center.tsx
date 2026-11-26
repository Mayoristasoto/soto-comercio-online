import { categoriaDe } from "@/lib/notificacionesCategorias";
import { useState, useEffect } from "react";
import { Bell, X, Check, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: (id: string) => void;
  onClearAll: () => void;
}

const typeConfig = {
  info: {
    icon: Info,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  success: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  error: {
    icon: AlertTriangle,
    color: "text-error",
    bgColor: "bg-error/10",
  },
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onClearAll,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay notificaciones
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? "bg-muted/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`shrink-0 rounded-full p-2 ${config.bgColor}`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => onClear(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.timestamp, {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>

                          {notification.actionUrl && (
                            <a href={notification.actionUrl} onClick={() => onMarkAsRead(notification.id)} className="text-xs font-medium text-primary hover:underline">
                              Ver
                            </a>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onMarkAsRead(notification.id)}
                              className="h-6 text-xs"
                            >
                              Marcar leída
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Hook para gestionar notificaciones (guardadas en la base, en tiempo real)
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let activo = true;
    const mapear = (r: any): Notification => ({
      id: r.id,
      type: String(r.tipo || "").startsWith("solicitud_") ? "warning" : "info",
      title: r.titulo,
      message: r.mensaje,
      timestamp: new Date(r.created_at),
      read: !!r.leida,
      actionUrl: r.metadata?.url,
    });
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activo) return;
      const cargar = async () => {
        const { data } = await supabase.from("notificaciones").select("*")
          .eq("usuario_id", user.id).order("created_at", { ascending: false }).limit(200);
        const { data: pr } = await (supabase as any).from("notificaciones_preferencias").select("categoria, habilitado").eq("usuario_id", user.id);
        const off = new Set((pr || []).filter((r: any) => !r.habilitado).map((r: any) => r.categoria));
        if (activo) setNotifications((data || []).filter((r: any) => !off.has(categoriaDe(r))).slice(0, 50).map(mapear));
      };
      await cargar();
      channel = supabase
        .channel(`notif-${user.id}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${user.id}` }, cargar)
        .subscribe();
    })();
    return () => { activo = false; if (channel) supabase.removeChannel(channel); };
  }, []);

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    setNotifications((prev) => [{ ...notification, id: crypto.randomUUID(), timestamp: new Date(), read: false }, ...prev]);
  };
  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  };
  const markAllAsRead = async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (ids.length) await supabase.from("notificaciones").update({ leida: true }).in("id", ids);
  };
  const clear = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notificaciones").delete().eq("id", id);
  };
  const clearAll = async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    if (ids.length) await supabase.from("notificaciones").delete().in("id", ids);
  };

  return { notifications, addNotification, markAsRead, markAllAsRead, clear, clearAll };
}
