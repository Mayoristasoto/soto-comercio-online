import { supabase } from "@/integrations/supabase/client"

export interface FotoVerificacion {
  empleadoId: string
  fichajeId?: string
  fotoBase64: string
  latitud?: number
  longitud?: number
  metodoFichaje: string
  confianzaFacial: number
  /** Token de dispositivo de kiosco (si aplica, para fallback server-side) */
  deviceToken?: string
}

/**
 * Sube una foto de verificación de fichaje al storage y guarda el registro.
 * Siempre usa la Edge Function para evitar problemas de RLS con usuarios sin sesión (kiosco).
 */
export async function guardarFotoVerificacion(data: FotoVerificacion): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.fichajeId) {
      console.warn('guardarFotoVerificacion: fichajeId no proporcionado, omitiendo guardado')
      return { success: false, error: 'fichajeId requerido' }
    }

    const deviceToken = data.deviceToken ?? localStorage.getItem('kiosk_device_token') ?? null
    const timestamp = Date.now()
    const fileName = `${data.fichajeId}/${timestamp}.jpg`

    // Siempre usar Edge Function (bypass RLS issues en kiosco sin sesión autenticada)
    console.log('[guardarFotoVerificacion] Subiendo foto via Edge Function...')
    
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'kiosk-upload-verification-photo',
      {
        body: {
          fichajeId: data.fichajeId,
          empleadoId: data.empleadoId,
          fotoBase64: data.fotoBase64,
          metodoFichaje: data.metodoFichaje,
          latitud: data.latitud ?? null,
          longitud: data.longitud ?? null,
          deviceToken,
          desiredStoragePath: fileName,
        },
      }
    )

    if (fnError) {
      console.error('[guardarFotoVerificacion] Edge Function error:', fnError)
      return { success: false, error: fnError.message }
    }

    const result = fnData as { success?: boolean; error?: string; storagePath?: string }

    if (result?.success) {
      console.log('✅ Foto de verificación guardada:', result.storagePath)
      return { success: true }
    }

    console.error('[guardarFotoVerificacion] Edge Function returned error:', result?.error)
    return { success: false, error: result?.error || 'No se pudo subir la foto' }

  } catch (error) {
    console.error('Error en guardarFotoVerificacion:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

/**
 * Captura una imagen del canvas del video
 */
export function capturarImagenCanvas(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch (error) {
    console.error('Error capturando imagen:', error)
    return null
  }
}
