import { supabase } from "@/integrations/supabase/client"

export interface FotoVerificacion {
  empleadoId: string
  fichajeId?: string
  fotoBase64: string
  latitud?: number
  longitud?: number
  metodoFichaje: string
  confianzaFacial: number
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
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('fichajes-verificacion')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      })
    
    if (uploadError) {
      console.error('Error subiendo foto de verificación:', uploadError)
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
