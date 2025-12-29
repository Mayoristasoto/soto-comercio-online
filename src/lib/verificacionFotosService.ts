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
 * Sube una foto de verificación de fichaje al storage y guarda el registro
 * usando la RPC segura kiosk_guardar_foto_verificacion.
 */
export async function guardarFotoVerificacion(data: FotoVerificacion): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.fichajeId) {
      console.warn('guardarFotoVerificacion: fichajeId no proporcionado, omitiendo guardado')
      return { success: false, error: 'fichajeId requerido' }
    }

    const timestamp = Date.now()
    // Path organizado por fichaje para evitar colisiones
    const fileName = `${data.fichajeId}/${timestamp}.jpg`
    
    // Convertir base64 a blob
    const base64Data = data.fotoBase64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    
    // Subir al bucket
    const { error: uploadError } = await supabase.storage
      .from('fichajes-verificacion')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Error subiendo foto de verificación:', uploadError)

      // Fallback: si el kiosco no tiene sesión/auth, subir desde Edge Function (con device token)
      const status = (uploadError as any)?.statusCode as number | undefined
      const isAuthError = status === 401 || status === 403 || /unauthorized|not authorized|jwt/i.test(uploadError.message)

      if (isAuthError) {
        try {
          const deviceToken = data.deviceToken ?? localStorage.getItem('kiosk_device_token') ?? null

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
            return { success: false, error: fnError.message }
          }

          if ((fnData as any)?.success) {
            return { success: true }
          }

          return { success: false, error: (fnData as any)?.error || 'No se pudo subir la foto (server)' }
        } catch (fallbackError) {
          console.error('Error en fallback de foto (Edge Function):', fallbackError)
          return {
            success: false,
            error: fallbackError instanceof Error ? fallbackError.message : 'Error desconocido'
          }
        }
      }

      return { success: false, error: uploadError.message }
    }
    
    // Obtener URL pública (solo accesible para admins por RLS)
    const { data: urlData } = supabase.storage
      .from('fichajes-verificacion')
      .getPublicUrl(fileName)
    
    // Guardar registro usando RPC segura (maneja upsert por fichaje_id)
    // Cast necesario porque la RPC aún no está en los tipos generados
    // Orden de parámetros: p_fichaje_id, p_empleado_id, p_foto_url, p_foto_storage_path, p_metodo, p_latitud, p_longitud
    const { error: rpcError } = await (supabase.rpc as any)('kiosk_guardar_foto_verificacion', {
      p_fichaje_id: data.fichajeId,
      p_empleado_id: data.empleadoId,
      p_foto_url: urlData.publicUrl,
      p_foto_storage_path: fileName,
      p_metodo: data.metodoFichaje,
      p_latitud: data.latitud ?? null,
      p_longitud: data.longitud ?? null
    })
    
    if (rpcError) {
      console.error('Error guardando registro de foto:', rpcError)
      // Intentar eliminar la foto subida si falla el registro
      await supabase.storage
        .from('fichajes-verificacion')
        .remove([fileName])
      return { success: false, error: rpcError.message }
    }
    
    console.log('✅ Foto de verificación guardada:', fileName)
    return { success: true }
    
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
