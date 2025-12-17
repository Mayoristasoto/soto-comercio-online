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
 */
export async function guardarFotoVerificacion(data: FotoVerificacion): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = Date.now()
    const fileName = `${data.empleadoId}/${timestamp}.jpg`
    
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
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error subiendo foto de verificación:', uploadError)
      return { success: false, error: uploadError.message }
    }
    
    // Obtener URL pública (solo accesible para admins por RLS)
    const { data: urlData } = supabase.storage
      .from('fichajes-verificacion')
      .getPublicUrl(fileName)
    
    // Guardar registro en la tabla
    const { error: insertError } = await supabase
      .from('fichajes_fotos_verificacion')
      .insert({
        empleado_id: data.empleadoId,
        fichaje_id: data.fichajeId || null,
        foto_url: urlData.publicUrl,
        foto_storage_path: fileName,
        latitud: data.latitud || null,
        longitud: data.longitud || null,
        metodo_fichaje: data.metodoFichaje,
        confianza_facial: data.confianzaFacial,
        timestamp_captura: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('Error guardando registro de foto:', insertError)
      // Intentar eliminar la foto subida si falla el registro
      await supabase.storage
        .from('fichajes-verificacion')
        .remove([fileName])
      return { success: false, error: insertError.message }
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
