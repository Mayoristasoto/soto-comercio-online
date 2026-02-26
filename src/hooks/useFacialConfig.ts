import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

interface FacialConfig {
  confidenceThresholdKiosk: number
  confidenceThresholdSpecific: number
  confidenceThresholdDemo: number
  maxAttemptsPerMinute: number
  livenessTimeoutSeconds: number
  faceDescriptorVersion: string
  emotionRecognitionEnabled: boolean
  autoPrintTasksEnabled: boolean
  lateArrivalAlertEnabled: boolean
  // Kiosk alert config
  kioskAlertLlegadaTardeSeconds: number
  kioskAlertCrucesRojasSeconds: number
  kioskAlertPausaExcedidaSeconds: number
  kioskAlertNovedadesSeconds: number
  kioskAlertTareasSeconds: number
  kioskAlertCrucesRojasEnabled: boolean
  kioskAlertPausaExcedidaEnabled: boolean
  kioskAlertNovedadesEnabled: boolean
  kioskAlertTareasEnabled: boolean
  kioskAlertOrder: string[]
}

const defaultConfig: FacialConfig = {
  confidenceThresholdKiosk: 0.60,
  confidenceThresholdSpecific: 0.72,
  confidenceThresholdDemo: 0.30,
  maxAttemptsPerMinute: 3,
  livenessTimeoutSeconds: 30,
  faceDescriptorVersion: "1.0",
  emotionRecognitionEnabled: true,
  autoPrintTasksEnabled: false,
  lateArrivalAlertEnabled: false,
  kioskAlertLlegadaTardeSeconds: 2,
  kioskAlertCrucesRojasSeconds: 2,
  kioskAlertPausaExcedidaSeconds: 2,
  kioskAlertNovedadesSeconds: 5,
  kioskAlertTareasSeconds: 10,
  kioskAlertCrucesRojasEnabled: true,
  kioskAlertPausaExcedidaEnabled: true,
  kioskAlertNovedadesEnabled: true,
  kioskAlertTareasEnabled: true,
  kioskAlertOrder: ["llegada_tarde","cruces_rojas","pausa_excedida","novedades","tareas_pendientes"],
}

const parseBool = (raw: any): boolean => {
  if (typeof raw === 'boolean') return raw
  const str = String(raw).toLowerCase()
  return str === 'true' || str === '1' || str === 'yes'
}

export function useFacialConfig() {
  const [config, setConfig] = useState<FacialConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('facial_recognition_config')
        .select('key, value')

      if (fetchError) {
        console.error('Error loading facial config:', fetchError)
        setError('Error al cargar configuración')
        return
      }

      if (data && data.length > 0) {
        const configMap = data.reduce((acc, item) => {
          acc[item.key] = item.value
          return acc
        }, {} as Record<string, string>)

        let alertOrder = defaultConfig.kioskAlertOrder
        try {
          const parsed = JSON.parse(configMap.kiosk_alert_order || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) alertOrder = parsed
        } catch {}

        setConfig({
          confidenceThresholdKiosk: parseFloat(configMap.confidence_threshold_kiosk) || defaultConfig.confidenceThresholdKiosk,
          confidenceThresholdSpecific: parseFloat(configMap.confidence_threshold_specific) || defaultConfig.confidenceThresholdSpecific,
          confidenceThresholdDemo: parseFloat(configMap.confidence_threshold_demo) || defaultConfig.confidenceThresholdDemo,
          maxAttemptsPerMinute: parseInt(configMap.max_attempts_per_minute) || defaultConfig.maxAttemptsPerMinute,
          livenessTimeoutSeconds: parseInt(configMap.liveness_timeout_seconds) || defaultConfig.livenessTimeoutSeconds,
          faceDescriptorVersion: (configMap.face_descriptor_version ?? defaultConfig.faceDescriptorVersion) as string,
          emotionRecognitionEnabled: parseBool(configMap.emotion_recognition_enabled),
          autoPrintTasksEnabled: parseBool(configMap.auto_print_tasks_enabled),
          lateArrivalAlertEnabled: parseBool(configMap.late_arrival_alert_enabled),
          kioskAlertLlegadaTardeSeconds: parseInt(configMap.kiosk_alert_llegada_tarde_seconds) || defaultConfig.kioskAlertLlegadaTardeSeconds,
          kioskAlertCrucesRojasSeconds: parseInt(configMap.kiosk_alert_cruces_rojas_seconds) || defaultConfig.kioskAlertCrucesRojasSeconds,
          kioskAlertPausaExcedidaSeconds: parseInt(configMap.kiosk_alert_pausa_excedida_seconds) || defaultConfig.kioskAlertPausaExcedidaSeconds,
          kioskAlertNovedadesSeconds: parseInt(configMap.kiosk_alert_novedades_seconds) || defaultConfig.kioskAlertNovedadesSeconds,
          kioskAlertTareasSeconds: parseInt(configMap.kiosk_alert_tareas_seconds) || defaultConfig.kioskAlertTareasSeconds,
          kioskAlertCrucesRojasEnabled: parseBool(configMap.kiosk_alert_cruces_rojas_enabled ?? 'true'),
          kioskAlertPausaExcedidaEnabled: parseBool(configMap.kiosk_alert_pausa_excedida_enabled ?? 'true'),
          kioskAlertNovedadesEnabled: parseBool(configMap.kiosk_alert_novedades_enabled ?? 'true'),
          kioskAlertTareasEnabled: parseBool(configMap.kiosk_alert_tareas_enabled ?? 'true'),
          kioskAlertOrder: alertOrder,
        })
      }
    } catch (err) {
      console.error('Error in loadConfig:', err)
      setError('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const dbKeyMap: Record<keyof FacialConfig, string> = {
    confidenceThresholdKiosk: 'confidence_threshold_kiosk',
    confidenceThresholdSpecific: 'confidence_threshold_specific',
    confidenceThresholdDemo: 'confidence_threshold_demo',
    maxAttemptsPerMinute: 'max_attempts_per_minute',
    livenessTimeoutSeconds: 'liveness_timeout_seconds',
    faceDescriptorVersion: 'face_descriptor_version',
    emotionRecognitionEnabled: 'emotion_recognition_enabled',
    autoPrintTasksEnabled: 'auto_print_tasks_enabled',
    lateArrivalAlertEnabled: 'late_arrival_alert_enabled',
    kioskAlertLlegadaTardeSeconds: 'kiosk_alert_llegada_tarde_seconds',
    kioskAlertCrucesRojasSeconds: 'kiosk_alert_cruces_rojas_seconds',
    kioskAlertPausaExcedidaSeconds: 'kiosk_alert_pausa_excedida_seconds',
    kioskAlertNovedadesSeconds: 'kiosk_alert_novedades_seconds',
    kioskAlertTareasSeconds: 'kiosk_alert_tareas_seconds',
    kioskAlertCrucesRojasEnabled: 'kiosk_alert_cruces_rojas_enabled',
    kioskAlertPausaExcedidaEnabled: 'kiosk_alert_pausa_excedida_enabled',
    kioskAlertNovedadesEnabled: 'kiosk_alert_novedades_enabled',
    kioskAlertTareasEnabled: 'kiosk_alert_tareas_enabled',
    kioskAlertOrder: 'kiosk_alert_order',
  }

  const updateConfig = async (key: keyof FacialConfig, value: string | number) => {
    try {
      const dbKey = dbKeyMap[key]

      const { error: updateError } = await supabase
        .from('facial_recognition_config')
        .update({ 
          value: value.toString(),
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('key', dbKey)

      if (updateError) {
        throw updateError
      }

      setConfig(prev => ({
        ...prev,
        [key]: typeof value === 'string' ? value : value
      }))

      return true
    } catch (err) {
      console.error('Error updating config:', err)
      setError('Error al actualizar configuración')
      return false
    }
  }

  return {
    config,
    loading,
    error,
    updateConfig,
    reload: loadConfig
  }
}
