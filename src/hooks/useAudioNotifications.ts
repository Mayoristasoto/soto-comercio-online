import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface AudioConfig {
  mensaje_audio_checkin: string
  mensaje_audio_tareas_pendientes: string
  audio_tareas_pendientes_activo: boolean
}

export const useAudioNotifications = () => {
  const [config, setConfig] = useState<AudioConfig>({
    mensaje_audio_checkin: '¡Bienvenido! Tu fichaje ha sido registrado correctamente.',
    mensaje_audio_tareas_pendientes: 'Tienes {cantidad} tareas pendientes para hoy. Recuerda revisarlas.',
    audio_tareas_pendientes_activo: true
  })

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('fichado_configuracion')
        .select('clave, valor')
        .in('clave', [
          'mensaje_audio_checkin',
          'mensaje_audio_tareas_pendientes',
          'audio_tareas_pendientes_activo'
        ])

      if (error) throw error

      const configData: any = {}
      data?.forEach(item => {
        if (item.clave === 'audio_tareas_pendientes_activo') {
          configData[item.clave] = item.valor === 'true'
        } else {
          configData[item.clave] = item.valor
        }
      })

      setConfig(prev => ({ ...prev, ...configData }))
    } catch (error) {
      console.error('Error cargando configuración de audio:', error)
    }
  }

  const reproducirMensajeBienvenida = async () => {
    await reproducirTexto(config.mensaje_audio_checkin)
  }

  const reproducirMensajeTareas = async (cantidadTareas: number) => {
    if (!config.audio_tareas_pendientes_activo || cantidadTareas === 0) {
      return
    }

    const mensaje = config.mensaje_audio_tareas_pendientes.replace(
      '{cantidad}',
      cantidadTareas.toString()
    )
    
    await reproducirTexto(mensaje)
  }

  const reproducirTexto = async (texto: string) => {
    try {
      // Intentar usar ElevenLabs primero
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text: texto,
          voice: 'Aria',
          model: 'eleven_turbo_v2_5'
        }
      })

      if (error) throw error

      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        await audio.play()
        return
      }
    } catch (error) {
      console.log('ElevenLabs no disponible, usando Web Speech API:', error)
    }

    // Fallback a Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(texto)
      utterance.lang = 'es-ES'
      utterance.rate = 0.9
      utterance.pitch = 1.0
      
      // Buscar voz en español
      const voices = speechSynthesis.getVoices()
      const spanishVoice = voices.find(voice => voice.lang.startsWith('es'))
      if (spanishVoice) {
        utterance.voice = spanishVoice
      }

      speechSynthesis.speak(utterance)
    }
  }

  return {
    config,
    reproducirMensajeBienvenida,
    reproducirMensajeTareas
  }
}
