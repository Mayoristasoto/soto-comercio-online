import { useEffect, useState, useCallback } from "react"
import { AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPendingPhotos, processPendingPhotos } from "@/lib/verificacionFotosService"

const POLL_INTERVAL_MS = 30_000

export default function PendingPhotosBanner() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setPendingCount(getPendingPhotos().length)
  }, [])

  const retry = useCallback(async () => {
    if (isRetrying) return
    if (!navigator.onLine) {
      setLastResult("Sin conexión a internet")
      return
    }
    setIsRetrying(true)
    try {
      const { uploaded, remaining } = await processPendingPhotos()
      setPendingCount(remaining)
      if (uploaded > 0) {
        setLastResult(`✅ ${uploaded} foto(s) subida(s)`)
        setTimeout(() => setLastResult(null), 4000)
      } else if (remaining > 0) {
        setLastResult("Aún sin éxito, se reintentará")
        setTimeout(() => setLastResult(null), 4000)
      }
    } finally {
      setIsRetrying(false)
    }
  }, [isRetrying])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    const onOnline = () => retry()
    window.addEventListener('pending-photos-changed', onChange)
    window.addEventListener('online', onOnline)

    const interval = setInterval(() => {
      if (getPendingPhotos().length > 0 && navigator.onLine) {
        retry()
      }
    }, POLL_INTERVAL_MS)

    return () => {
      window.removeEventListener('pending-photos-changed', onChange)
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
    }
  }, [refresh, retry])

  if (pendingCount === 0 && !lastResult) return null

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-1rem)]">
      <div className="bg-destructive/10 border border-destructive/30 backdrop-blur rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        {pendingCount > 0 ? (
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        )}
        <div className="flex-1 text-sm">
          {pendingCount > 0 ? (
            <>
              <p className="font-medium text-destructive">
                {pendingCount} foto(s) pendiente(s) de subir
              </p>
              <p className="text-xs text-muted-foreground">
                {lastResult || "Se reintentan automáticamente cada 30s"}
              </p>
            </>
          ) : (
            <p className="text-green-700 font-medium">{lastResult}</p>
          )}
        </div>
        {pendingCount > 0 && (
          <Button size="sm" variant="outline" onClick={retry} disabled={isRetrying}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}
