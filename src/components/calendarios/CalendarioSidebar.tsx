import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Share2, Pencil, Trash2, Cake, Palmtree, AlarmClock, Calendar as CalendarIcon } from "lucide-react";
import { Calendario, VIRTUAL_CALENDARS } from "@/lib/calendariosService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Props {
  calendarios: Calendario[];
  activos: Set<string>;
  isAdmin: boolean;
  onToggle: (id: string, visible: boolean) => void;
  onCrearCalendario: () => void;
  onEditar: (cal: Calendario) => void;
  onCompartir: (cal: Calendario) => void;
  onEliminar: (cal: Calendario) => void;
  onCrearEvento: () => void;
}

const VirtualIcon = ({ id }: { id: string }) => {
  if (id === "virtual:cumpleanos") return <Cake className="h-3.5 w-3.5" />;
  if (id === "virtual:vacaciones") return <Palmtree className="h-3.5 w-3.5" />;
  if (id === "virtual:deadlines") return <AlarmClock className="h-3.5 w-3.5" />;
  return <CalendarIcon className="h-3.5 w-3.5" />;
};

export function CalendarioSidebar({
  calendarios,
  activos,
  isAdmin,
  onToggle,
  onCrearCalendario,
  onEditar,
  onCompartir,
  onEliminar,
  onCrearEvento,
}: Props) {
  const propios = calendarios.filter((c) => c.permiso === "owner");
  const compartidos = calendarios.filter((c) => c.permiso !== "owner");

  return (
    <div className="w-64 shrink-0 border-r bg-card/40 p-4 space-y-5 overflow-y-auto">
      {isAdmin && (
        <Button onClick={onCrearEvento} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo evento
        </Button>
      )}

      <Section title="Mis calendarios">
        {propios.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin calendarios propios.</p>
        )}
        {propios.map((c) => (
          <CalRow
            key={c.id}
            id={c.id}
            color={c.color}
            label={c.nombre}
            checked={activos.has(c.id)}
            onCheck={(v) => onToggle(c.id, v)}
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditar(c)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCompartir(c)}>
                    <Share2 className="h-3.5 w-3.5 mr-2" /> Compartir
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEliminar(c)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ))}
        {isAdmin && (
          <Button
            onClick={onCrearCalendario}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-7"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Crear calendario
          </Button>
        )}
      </Section>

      {compartidos.length > 0 && (
        <Section title="Compartidos conmigo">
          {compartidos.map((c) => (
            <CalRow
              key={c.id}
              id={c.id}
              color={c.color}
              label={c.nombre}
              sub={c.owner_nombre ?? undefined}
              badge={c.permiso === "edit" ? "Editor" : undefined}
              checked={activos.has(c.id)}
              onCheck={(v) => onToggle(c.id, v)}
            />
          ))}
        </Section>
      )}

      <Section title="Otros">
        {VIRTUAL_CALENDARS.map((v) => (
          <div key={v.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/40">
            <Checkbox
              checked={activos.has(v.id)}
              onCheckedChange={(c) => onToggle(v.id, !!c)}
              style={{ borderColor: v.color, backgroundColor: activos.has(v.id) ? v.color : undefined }}
            />
            <span className="flex items-center gap-1.5 text-sm flex-1" style={{ color: v.color }}>
              <VirtualIcon id={v.id} />
              {v.nombre}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">{title}</p>
    {children}
  </div>
);

const CalRow = ({
  color,
  label,
  sub,
  badge,
  checked,
  onCheck,
  actions,
}: {
  id: string;
  color: string;
  label: string;
  sub?: string;
  badge?: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
  actions?: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/40 group">
    <Checkbox
      checked={checked}
      onCheckedChange={(c) => onCheck(!!c)}
      style={{ borderColor: color, backgroundColor: checked ? color : undefined }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm truncate">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
    {badge && (
      <Badge variant="outline" className="text-[10px] h-4 px-1">
        {badge}
      </Badge>
    )}
    {actions}
  </div>
);
