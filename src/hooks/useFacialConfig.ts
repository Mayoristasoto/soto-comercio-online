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
}

const defaultConfig: FacialConfig = {
  confidenceThresholdKiosk: 0.65,
  confidenceThresholdSpecific: 0.60,
  confidenceThresholdDemo: 0.35,
  maxAttemptsPerMinute: 3,
  livenessTimeoutSeconds: 30,
  faceDescriptorVersion: "1.0",
  emotionRecognitionEnabled: false
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

        setConfig({
          confidenceThresholdKiosk: parseFloat(configMap.confidence_threshold_kiosk) || defaultConfig.confidenceThresholdKiosk,
          confidenceThresholdSpecific: parseFloat(configMap.confidence_threshold_specific) || defaultConfig.confidenceThresholdSpecific,
          confidenceThresholdDemo: parseFloat(configMap.confidence_threshold_demo) || defaultConfig.confidenceThresholdDemo,
          maxAttemptsPerMinute: parseInt(configMap.max_attempts_per_minute) || defaultConfig.maxAttemptsPerMinute,
          livenessTimeoutSeconds: parseInt(configMap.liveness_timeout_seconds) || defaultConfig.livenessTimeoutSeconds,
          faceDescriptorVersion: (configMap.face_descriptor_version ?? defaultConfig.faceDescriptorVersion) as string,
          emotionRecognitionEnabled: (() => {
            const raw = (configMap as any).emotion_recognition_enabled;
            if (typeof raw === 'boolean') return raw;
            const str = String(raw).toLowerCase();
            return str === 'true' || str === '1' || str === 'yes';
          })()
        })
      }
    } catch (err) {
      console.error('Error in loadConfig:', err)
      setError('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (key: keyof FacialConfig, value: string | number) => {
    try {
      const dbKey = {
        confidenceThresholdKiosk: 'confidence_threshold_kiosk',
        confidenceThresholdSpecific: 'confidence_threshold_specific',
        confidenceThresholdDemo: 'confidence_threshold_demo',
        maxAttemptsPerMinute: 'max_attempts_per_minute',
        livenessTimeoutSeconds: 'liveness_timeout_seconds',
        faceDescriptorVersion: 'face_descriptor_version',
        emotionRecognitionEnabled: 'emotion_recognition_enabled'
      }[key]

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

      // Actualizar estado local
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