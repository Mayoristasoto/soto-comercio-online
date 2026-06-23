import * as faceapi from '@vladmandic/face-api'

let modelsLoaded = false

async function ensureModels() {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  ])
  modelsLoaded = true
}

// Eye Aspect Ratio (EAR) — Soukupová & Čech
function ear(eye: faceapi.Point[]): number {
  const dist = (a: faceapi.Point, b: faceapi.Point) =>
    Math.hypot(a.x - b.x, a.y - b.y)
  const A = dist(eye[1], eye[5])
  const B = dist(eye[2], eye[4])
  const C = dist(eye[0], eye[3])
  return (A + B) / (2 * C)
}

export interface LivenessOptions {
  timeoutMs?: number
  onProgress?: (msg: string) => void
  onCancel?: () => boolean
}

/**
 * Detecta al menos un parpadeo en el video stream.
 * Resuelve true si se detecta, false si timeout/cancelado.
 */
export async function detectarParpadeo(
  video: HTMLVideoElement,
  opts: LivenessOptions = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 8000
  await ensureModels()

  const CLOSED = 0.21
  const OPEN = 0.27

  const t0 = Date.now()
  let state: 'open' | 'closed' = 'open'
  let blinks = 0

  while (Date.now() - t0 < timeoutMs) {
    if (opts.onCancel?.()) return false

    const det = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()

    if (det) {
      const lm = det.landmarks
      const leftEAR = ear(lm.getLeftEye())
      const rightEAR = ear(lm.getRightEye())
      const avg = (leftEAR + rightEAR) / 2

      if (state === 'open' && avg < CLOSED) {
        state = 'closed'
        opts.onProgress?.('Ojos cerrados...')
      } else if (state === 'closed' && avg > OPEN) {
        state = 'open'
        blinks++
        opts.onProgress?.(`Parpadeo detectado (${blinks})`)
        if (blinks >= 1) return true
      }
    } else {
      opts.onProgress?.('Acerque su rostro a la cámara')
    }

    await new Promise(r => setTimeout(r, 120))
  }

  return false
}
