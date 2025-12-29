import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type Body = {
  storagePath: string
  deviceToken?: string | null
  expiresInSeconds?: number | null
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  const requestId = crypto.randomUUID()

  try {
    const body = (await req.json()) as Body

    if (!body?.storagePath) {
      console.warn("[kiosk-get-verification-photo-url] missing storagePath", { requestId })
      return json(400, { success: false, error: "Parámetro requerido: storagePath" })
    }

    const expiresInSeconds = Math.min(Math.max(body.expiresInSeconds ?? 300, 60), 600) // 1 a 10 min

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Requerir token de dispositivo SOLO si validación está activa y hay dispositivos activos.
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
    } catch (_e) {
      requireDeviceToken = true
    }

    if (requireDeviceToken && !body?.deviceToken) {
      console.warn("[kiosk-get-verification-photo-url] missing deviceToken", { requestId })
      return json(400, { success: false, error: "Parámetro requerido: deviceToken" })
    }

    if (requireDeviceToken) {
      const { data: validData, error: validError } = await supabaseAdmin.rpc("validate_kiosk_device", {
        p_device_token: body.deviceToken,
      })

      const isValid = !validError && Array.isArray(validData) && validData[0]?.is_valid === true

      if (!isValid) {
        console.warn("[kiosk-get-verification-photo-url] invalid device", {
          requestId,
          validError: validError?.message,
        })
        return json(401, { success: false, error: "Dispositivo no autorizado" })
      }
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("fichajes-verificacion")
      .createSignedUrl(body.storagePath, expiresInSeconds)

    if (signedError || !signedData?.signedUrl) {
      console.error("[kiosk-get-verification-photo-url] createSignedUrl error", {
        requestId,
        signedError: signedError?.message,
      })
      return json(404, { success: false, error: signedError?.message || "No se pudo generar URL" })
    }

    return json(200, { success: true, signedUrl: signedData.signedUrl, expiresInSeconds })
  } catch (error) {
    console.error("[kiosk-get-verification-photo-url] fatal", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return json(500, { success: false, error: "Error interno" })
  }
})
