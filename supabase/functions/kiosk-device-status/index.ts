import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type Body = {
  deviceToken?: string | null
  activateToken?: string | null
}

type Status = "authorized" | "unauthorized" | "no_devices"

type OkResponse = {
  success: true
  status: Status
  device_name?: string
  used_token?: "activate" | "stored"
  invalidate_stored_token?: boolean
}

type ErrorResponse = {
  success: false
  error: string
}

function json(status: number, payload: OkResponse | ErrorResponse) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") return null
  const token = value.trim()
  if (!token) return null
  // UUIDs are 36 chars; keep a safe upper bound
  if (token.length > 200) return null
  return token
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  const requestId = crypto.randomUUID()

  try {
    const body = (await req.json().catch(() => ({}))) as Body

    const activateToken = normalizeToken(body?.activateToken)
    const deviceToken = normalizeToken(body?.deviceToken)

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Requerir token SOLO si la validación está activa y hay dispositivos activos.
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

    if (!requireDeviceToken) {
      return json(200, { success: true, status: "no_devices" })
    }

    // Prioriza activación por URL (admin) sobre token almacenado.
    const tokenToValidate = activateToken ?? deviceToken

    if (!tokenToValidate) {
      return json(200, { success: true, status: "unauthorized" })
    }

    const { data: validData, error: validError } = await supabaseAdmin.rpc("validate_kiosk_device", {
      p_device_token: tokenToValidate,
    })

    const isValid = !validError && Array.isArray(validData) && validData[0]?.is_valid === true

    if (!isValid) {
      return json(200, {
        success: true,
        status: "unauthorized",
        invalidate_stored_token: tokenToValidate === deviceToken,
      })
    }

    return json(200, {
      success: true,
      status: "authorized",
      device_name: validData[0]?.device_name ?? undefined,
      used_token: tokenToValidate === activateToken ? "activate" : "stored",
    })
  } catch (error) {
    console.error("[kiosk-device-status] fatal", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return json(500, { success: false, error: "Error interno" })
  }
})
