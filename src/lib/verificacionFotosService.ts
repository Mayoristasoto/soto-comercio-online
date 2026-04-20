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

interface PendingPhoto extends FotoVerificacion {
  queuedAt: number
  attempts: number
}

const PENDING_KEY = 'pending_photos'
const RETRY_DELAYS_MS = [1000, 3000, 9000]

/** Sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Lee la cola de fotos pendientes desde localStorage */
export function getPendingPhotos(): PendingPhoto[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingPhoto[]) : []
  } catch {
    return []
  }
}

function setPendingPhotos(photos: PendingPhoto[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(photos))
    window.dispatchEvent(new CustomEvent('pending-photos-changed'))
  } catch (e) {
    console.error('No se pudo persistir cola de fotos pendientes:', e)
  }
}

function enqueuePhoto(data: FotoVerificacion) {
  const list = getPendingPhotos()
  // evitar duplicados por fichajeId
  if (data.fichajeId && list.some((p) => p.fichajeId === data.fichajeId)) return
  list.push({ ...data, queuedAt: Date.now(), attempts: 0 })
  setPendingPhotos(list)
}

function removePending(fichajeId: string) {
  const list = getPendingPhotos().filter((p) => p.fichajeId !== fichajeId)
  setPendingPhotos(list)
}

/** Intenta subir una foto vía Edge Function (sin reintentos). */
async function uploadOnce(
  data: FotoVerificacion
): Promise<{ success: boolean; error?: string; storagePath?: string }> {
  if (!data.fichajeId) return { success: false, error: 'fichajeId requerido' }

  const deviceToken = data.deviceToken ?? localStorage.getItem('kiosk_device_token') ?? null
  const timestamp = Date.now()
  const fileName = `${data.fichajeId}/${timestamp}.jpg`

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

  if (fnError) return { success: false, error: fnError.message }

  const result = fnData as { success?: boolean; error?: string; storagePath?: string }
  if (result?.success) return { success: true, storagePath: result.storagePath }
  return { success: false, error: result?.error || 'No se pudo subir la foto' }
}

/**
 * Sube una foto de verificación con reintentos automáticos.
 * Si todos los reintentos fallan, encola la foto en localStorage para reintentar luego.
 */
export async function guardarFotoVerificacion(
  data: FotoVerificacion
): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  if (!data.fichajeId) {
    console.warn('guardarFotoVerificacion: fichajeId no proporcionado')
    return { success: false, error: 'fichajeId requerido' }
  }

  let lastError: string | undefined
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      console.log(`[guardarFotoVerificacion] intento ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}`)
      const result = await uploadOnce(data)
      if (result.success) {
        console.log('✅ Foto de verificación guardada:', result.storagePath)
        return { success: true }
      }
      lastError = result.error
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Error desconocido'
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }

  // Todos los reintentos fallaron → encolar
  console.error('[guardarFotoVerificacion] todos los reintentos fallaron, encolando:', lastError)
  enqueuePhoto(data)
  return { success: false, error: lastError, queued: true }
}

/**
 * Procesa la cola de fotos pendientes. Devuelve cuántas se subieron exitosamente.
 */
export async function processPendingPhotos(): Promise<{ uploaded: number; remaining: number }> {
  const list = getPendingPhotos()
  if (list.length === 0) return { uploaded: 0, remaining: 0 }

  let uploaded = 0
  for (const photo of [...list]) {
    if (!photo.fichajeId) {
      removePending(photo.fichajeId || '')
      continue
    }
    const result = await uploadOnce(photo)
    if (result.success) {
      removePending(photo.fichajeId)
      uploaded++
    } else {
      // incrementar contador de intentos
      const updated = getPendingPhotos().map((p) =>
        p.fichajeId === photo.fichajeId ? { ...p, attempts: p.attempts + 1 } : p
      )
      setPendingPhotos(updated)
    }
  }

  return { uploaded, remaining: getPendingPhotos().length }
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
