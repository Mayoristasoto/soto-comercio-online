import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, CircleDashed } from "lucide-react";
import { resumirItems, type ChecklistItem } from "./checklistTypes";

interface Props {
  items: Pick<ChecklistItem, "estado">[];
  compacto?: boolean;
}

export function ResumenChecklist({ items, compacto = false }: Props) {
  const r = resumirItems(items);

  const cards = [
    { label: "Cumple", value: r.cumple, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Cumple Parcial", value: r.parcial, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "No Cumple", value: r.noCumple, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Sin evaluar", value: r.sinEvaluar, icon: CircleDashed, color: "text-muted-foreground", bg: "bg-muted" },
  ];

  if (compacto) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {cards.map((c) => (
          <span key={c.label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${c.bg} ${c.color}`}>
            <c.icon className="h-3 w-3" />
            {c.value}
          </span>
        ))}
        <span className="text-muted-foreground">· {r.porcentaje}% cumplimiento</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-md p-2 ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {r.evaluados} de {r.total} ítems evaluados
          </span>
          <span className="font-medium text-foreground">{r.porcentaje}% de cumplimiento</span>
        </div>
        <Progress value={r.porcentaje} />
      </div>
    </div>
  );
}
