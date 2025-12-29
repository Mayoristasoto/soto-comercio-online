import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type UploadBody = {
  fichajeId: string
  empleadoId: string
  fotoBase64: string
  metodoFichaje: string
  latitud?: number | null
  longitud?: number | null
  deviceToken: string
  desiredStoragePath?: string | null
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function base64ToBytes(dataUrlOrBase64: string): Uint8Array {
  const base64 = dataUrlOrBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    const body = (await req.json()) as UploadBody

    if (!body?.fichajeId || !body?.empleadoId || !body?.fotoBase64 || !body?.metodoFichaje) {
      console.warn("[kiosk-upload-verification-photo] missing params", { requestId })
      return json(400, { success: false, error: "Parámetros requeridos: fichajeId, empleadoId, fotoBase64, metodoFichaje" })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // Requerir token de dispositivo SOLO si la validación de dispositivos está activa
    // y existen dispositivos activos (evita romper entornos donde se permite kiosco sin registro).
    let requireDeviceToken = true
    try {
      const { data: configRow } = await supabaseAdmin
        .from("facial_recognition_config")
        .select("value")
        .eq("key", "kiosk_device_validation_enabled")
        .maybeSingle()

      const validationEnabled = configRow?.value !== "false"

      const { data: activeDevices } = await supabaseAdmin
        .from("kiosk_devices")
        .select("id")
        .eq("is_active", true)
        .limit(1)

      const hasActiveDevices = Array.isArray(activeDevices) && activeDevices.length > 0
      requireDeviceToken = validationEnabled && hasActiveDevices
    } catch (e) {
      // Fallback seguro: si no podemos determinarlo, requerir token.
      requireDeviceToken = true
    }

    if (requireDeviceToken && !body?.deviceToken) {
      console.warn("[kiosk-upload-verification-photo] missing deviceToken", { requestId })
      return json(400, { success: false, error: "Parámetro requerido: deviceToken" })
    }

    // Validar dispositivo (evita abuso del endpoint público)
    if (requireDeviceToken) {
      const { data: validData, error: validError } = await supabaseAdmin.rpc("validate_kiosk_device", {
        p_device_token: body.deviceToken,
      })

      const isValid = !validError && Array.isArray(validData) && validData[0]?.is_valid === true

      if (!isValid) {
        console.warn("[kiosk-upload-verification-photo] invalid device", {
          requestId,
          validError: validError?.message,
        })
        return json(401, { success: false, error: "Dispositivo no autorizado" })
      }
    }

    const storagePath = body.desiredStoragePath || `${body.fichajeId}/${Date.now()}.jpg`
    const bytes = base64ToBytes(body.fotoBase64)

    console.log("[kiosk-upload-verification-photo] uploading", {
      requestId,
      fichajeId: body.fichajeId,
      empleadoId: body.empleadoId,
      storagePath,
      bytes: bytes.length,
    })

    const { error: uploadError } = await supabaseAdmin.storage
      .from("fichajes-verificacion")
      .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true })

    if (uploadError) {
      console.error("[kiosk-upload-verification-photo] uploadError", { requestId, uploadError })
      return json(500, { success: false, error: uploadError.message })
    }

    const { data: urlData } = supabaseAdmin.storage.from("fichajes-verificacion").getPublicUrl(storagePath)

    const { error: rpcError } = await supabaseAdmin.rpc("kiosk_guardar_foto_verificacion", {
      p_fichaje_id: body.fichajeId,
      p_empleado_id: body.empleadoId,
      p_foto_url: urlData.publicUrl,
      p_foto_storage_path: storagePath,
      p_metodo: body.metodoFichaje,
      p_latitud: body.latitud ?? null,
      p_longitud: body.longitud ?? null,
    })

    if (rpcError) {
      console.error("[kiosk-upload-verification-photo] rpcError", { requestId, rpcError })
      return json(500, { success: false, error: rpcError.message })
    }

    console.log("[kiosk-upload-verification-photo] ok", { requestId, storagePath })
    return json(200, { success: true, storagePath })
  } catch (error) {
    console.error("[kiosk-upload-verification-photo] fatal", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return json(500, { success: false, error: "Error interno" })
  }
})
