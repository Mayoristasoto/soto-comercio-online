import { useState, useEffect } from "react"
import { useFacialConfig } from "@/hooks/useFacialConfig"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import {
  Clock, AlertTriangle, ShieldAlert, Coffee, Bell, ClipboardList,
  ArrowUp, ArrowDown, Save, RotateCcw, GripVertical, Zap, Eye
} from "lucide-react"

interface AlertDef {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  canDisable: boolean // llegada_tarde is always on
  secondsKey: string
  enabledKey?: string
}

const ALERT_DEFS: Record<string, AlertDef> = {
  llegada_tarde: {
    id: 'llegada_tarde',
    label: 'Llegada Tarde',
    description: 'Se muestra cuando el empleado llega después de la hora programada + tolerancia',
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-amber-500',
    canDisable: false,
    secondsKey: 'kioskAlertLlegadaTardeSeconds',
  },
  cruces_rojas: {
    id: 'cruces_rojas',
    label: 'Cruces Rojas',
    description: 'Resumen de infracciones acumuladas del empleado (llegadas tarde, pausas excedidas)',
    icon: <ShieldAlert className="h-5 w-5" />,
    color: 'text-destructive',
    canDisable: true,
    secondsKey: 'kioskAlertCrucesRojasSeconds',
    enabledKey: 'kioskAlertCrucesRojasEnabled',
  },
  pausa_excedida: {
    id: 'pausa_excedida',
    label: 'Pausa Excedida',
    description: 'Se muestra cuando el empleado excedió los minutos de descanso permitidos',
    icon: <Coffee className="h-5 w-5" />,
    color: 'text-orange-500',
    canDisable: true,
    secondsKey: 'kioskAlertPausaExcedidaSeconds',
    enabledKey: 'kioskAlertPausaExcedidaEnabled',
  },
  novedades: {
    id: 'novedades',
    label: 'Novedades',
    description: 'Alertas y comunicados pendientes de lectura para el empleado',
    icon: <Bell className="h-5 w-5" />,
    color: 'text-primary',
    canDisable: true,
    secondsKey: 'kioskAlertNovedadesSeconds',
    enabledKey: 'kioskAlertNovedadesEnabled',
  },
  tareas_pendientes: {
    id: 'tareas_pendientes',
    label: 'Tareas Pendientes',
    description: 'Lista de tareas asignadas que el empleado debe completar hoy',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'text-blue-500',
    canDisable: true,
    secondsKey: 'kioskAlertTareasSeconds',
    enabledKey: 'kioskAlertTareasEnabled',
  },
}

export function KioskAlertConfig() {
  const { config, loading, updateConfig, reload } = useFacialConfig()
  const [order, setOrder] = useState<string[]>([])
  const [seconds, setSeconds] = useState<Record<string, number>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (!loading) {
      setOrder(config.kioskAlertOrder)
      setSeconds({
        llegada_tarde: config.kioskAlertLlegadaTardeSeconds,
        cruces_rojas: config.kioskAlertCrucesRojasSeconds,
        pausa_excedida: config.kioskAlertPausaExcedidaSeconds,
        novedades: config.kioskAlertNovedadesSeconds,
        tareas_pendientes: config.kioskAlertTareasSeconds,
      })
      setEnabled({
        cruces_rojas: config.kioskAlertCrucesRojasEnabled,
        pausa_excedida: config.kioskAlertPausaExcedidaEnabled,
        novedades: config.kioskAlertNovedadesEnabled,
        tareas_pendientes: config.kioskAlertTareasEnabled,
      })
    }
  }, [loading, config])

  const moveUp = (idx: number) => {
    if (idx <= 0) return
    const newOrder = [...order]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    setOrder(newOrder)
    setHasChanges(true)
  }

  const moveDown = (idx: number) => {
    if (idx >= order.length - 1) return
    const newOrder = [...order]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    setOrder(newOrder)
    setHasChanges(true)
  }

  const handleSecondsChange = (id: string, val: number) => {
    setSeconds(prev => ({ ...prev, [id]: Math.max(1, Math.min(60, val)) }))
    setHasChanges(true)
  }

  const handleEnabledChange = (id: string, val: boolean) => {
    setEnabled(prev => ({ ...prev, [id]: val }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: Promise<boolean>[] = [
        updateConfig('kioskAlertLlegadaTardeSeconds', seconds.llegada_tarde),
        updateConfig('kioskAlertCrucesRojasSeconds', seconds.cruces_rojas),
        updateConfig('kioskAlertPausaExcedidaSeconds', seconds.pausa_excedida),
        updateConfig('kioskAlertNovedadesSeconds', seconds.novedades),
        updateConfig('kioskAlertTareasSeconds', seconds.tareas_pendientes),
        updateConfig('kioskAlertCrucesRojasEnabled', enabled.cruces_rojas ? 'true' : 'false'),
        updateConfig('kioskAlertPausaExcedidaEnabled', enabled.pausa_excedida ? 'true' : 'false'),
        updateConfig('kioskAlertNovedadesEnabled', enabled.novedades ? 'true' : 'false'),
        updateConfig('kioskAlertTareasEnabled', enabled.tareas_pendientes ? 'true' : 'false'),
        updateConfig('kioskAlertOrder', JSON.stringify(order)),
      ]
      await Promise.all(updates)
      setHasChanges(false)
      toast({ title: "✅ Configuración guardada", description: "Los cambios en las alertas del kiosco se aplicarán en el próximo fichaje." })
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar los cambios", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    reload()
    setHasChanges(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  const totalActiveTime = order
    .filter(id => id === 'llegada_tarde' || enabled[id])
    .reduce((sum, id) => sum + (seconds[id] || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Alertas del Kiosco</h3>
            <p className="text-sm text-muted-foreground">
              Configurá el orden, duración y estado de cada alerta que se muestra al fichar
            </p>
          </div>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-1" /> Descartar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      {/* Flow Preview */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Vista previa del flujo</span>
          <Badge variant="outline" className="ml-auto text-xs">
            ~{totalActiveTime}s total
          </Badge>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
            📸 Fichaje
          </Badge>
          {order.map((id, idx) => {
            const def = ALERT_DEFS[id]
            if (!def) return null
            const isActive = id === 'llegada_tarde' || enabled[id]
            return (
              <div key={id} className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">→</span>
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={`text-xs ${!isActive ? 'opacity-40 line-through' : ''}`}
                >
                  {def.label} ({seconds[id]}s)
                </Badge>
              </div>
            )
          })}
          <span className="text-muted-foreground text-xs">→</span>
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
            ✅ Reset
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Solo se muestran las alertas que correspondan (ej: "Llegada Tarde" solo si llegó tarde)
        </p>
      </Card>

      {/* Alert List */}
      <div className="space-y-2">
        {order.map((id, idx) => {
          const def = ALERT_DEFS[id]
          if (!def) return null
          const isActive = id === 'llegada_tarde' || enabled[id]

          return (
            <Card
              key={id}
              className={`p-4 transition-all ${!isActive ? 'opacity-50 bg-muted/20' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center gap-4">
                {/* Position & Move */}
                <div className="flex flex-col items-center gap-1 min-w-[40px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveDown(idx)}
                    disabled={idx === order.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Icon */}
                <div className={`p-2 rounded-lg bg-background border ${def.color}`}>
                  {def.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{def.label}</span>
                    {!def.canDisable && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Siempre activa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {def.description}
                  </p>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={seconds[id] || 2}
                    onChange={(e) => handleSecondsChange(id, parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-center text-sm"
                    disabled={!isActive}
                  />
                  <span className="text-xs text-muted-foreground">seg</span>
                </div>

                {/* Toggle */}
                <div className="min-w-[50px] flex justify-end">
                  {def.canDisable ? (
                    <Switch
                      checked={enabled[id] ?? true}
                      onCheckedChange={(val) => handleEnabledChange(id, val)}
                    />
                  ) : (
                    <div className="w-11" /> // spacer
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Save bar (sticky when changes) */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-4 -mx-6 -mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Tenés cambios sin guardar</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDiscard} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-1" /> Descartar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
