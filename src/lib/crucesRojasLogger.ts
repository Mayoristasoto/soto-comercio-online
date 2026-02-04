/**
 * Logger centralizado para diagnóstico del registro de cruces rojas
 * Permite rastrear por qué las infracciones no se están guardando
 */

export type TipoInfraccion = 'llegada_tarde' | 'pausa_excedida'
export type ResultadoVerificacion = 'exito' | 'sin_turno' | 'puntual' | 'error' | 'no_excedida'

export const logCruzRoja = {
  /**
   * Log al inicio de la verificación
   */
  inicio: (tipo: TipoInfraccion, empleadoId: string, fichajeId: string | null, configEnabled: boolean) => {
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] === INICIO VERIFICACIÓN ===`)
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] empleadoId: ${empleadoId}`)
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] fichajeId: ${fichajeId}`)
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] configEnabled: ${configEnabled}`)
  },

  /**
   * Log de datos del turno obtenidos
   */
  turnoData: (tipo: TipoInfraccion, data: any, error: any) => {
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] turnoData:`, JSON.stringify(data, null, 2))
    if (error) {
      console.error(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] turnoError:`, JSON.stringify(error))
    }
  },

  /**
   * Log de cálculos de hora/minutos
   */
  calculoLlegadaTarde: (params: {
    horaEntradaProgramada: string
    tolerancia: number
    horaLimite: string
    horaActual: string
    esTarde: boolean
    minutosRetraso?: number
  }) => {
    console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] === CÁLCULO ===`)
    console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] horaEntradaProgramada: ${params.horaEntradaProgramada}`)
    console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] tolerancia: ${params.tolerancia} min`)
    console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] horaLimite: ${params.horaLimite}`)
    console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] horaActual: ${params.horaActual}`)
    console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] ¿Llegó tarde?: ${params.esTarde}`)
    if (params.minutosRetraso !== undefined) {
      console.log(`🔍 [CRUZ-ROJA:LLEGADA_TARDE] minutosRetraso: ${params.minutosRetraso}`)
    }
  },

  calculoPausaExcedida: (params: {
    minutosTranscurridos: number
    minutosPermitidos: number
    excedida: boolean
    minutosExceso?: number
  }) => {
    console.log(`🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] === CÁLCULO ===`)
    console.log(`🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] minutosTranscurridos: ${params.minutosTranscurridos}`)
    console.log(`🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] minutosPermitidos: ${params.minutosPermitidos}`)
    console.log(`🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] ¿Excedida?: ${params.excedida}`)
    if (params.minutosExceso !== undefined) {
      console.log(`🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] minutosExceso: ${params.minutosExceso}`)
    }
  },

  /**
   * Log antes de llamar al RPC
   */
  rpcLlamada: (tipo: TipoInfraccion, params: Record<string, any>) => {
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] === LLAMANDO RPC kiosk_registrar_cruz_roja ===`)
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] Parámetros:`, JSON.stringify(params, null, 2))
  },

  /**
   * Log del resultado del RPC
   */
  rpcResultado: (tipo: TipoInfraccion, data: any, error: any) => {
    if (error) {
      console.error(`❌ [CRUZ-ROJA:${tipo.toUpperCase()}] Error RPC:`, JSON.stringify(error))
    } else {
      console.log(`✅ [CRUZ-ROJA:${tipo.toUpperCase()}] Cruz roja registrada exitosamente`)
      console.log(`✅ [CRUZ-ROJA:${tipo.toUpperCase()}] Resultado:`, data)
    }
  },

  /**
   * Log de excepción capturada
   */
  excepcion: (tipo: TipoInfraccion, error: any) => {
    console.error(`❌ [CRUZ-ROJA:${tipo.toUpperCase()}] Excepción capturada:`, error)
    if (error instanceof Error) {
      console.error(`❌ [CRUZ-ROJA:${tipo.toUpperCase()}] Stack:`, error.stack)
    }
  },

  /**
   * Log al final de la verificación
   */
  fin: (tipo: TipoInfraccion, resultado: ResultadoVerificacion) => {
    const emoji = resultado === 'exito' ? '✅' : resultado === 'puntual' || resultado === 'no_excedida' ? '👍' : '⚠️'
    console.log(`${emoji} [CRUZ-ROJA:${tipo.toUpperCase()}] === FIN VERIFICACIÓN (${resultado}) ===`)
  },

  /**
   * Log de advertencia cuando no se encuentra turno
   */
  sinTurno: (tipo: TipoInfraccion, empleadoId: string) => {
    console.warn(`⚠️ [CRUZ-ROJA:${tipo.toUpperCase()}] No se encontró turno activo para empleado: ${empleadoId}`)
  },

  /**
   * Log cuando la config está deshabilitada
   */
  configDeshabilitada: (tipo: TipoInfraccion) => {
    console.log(`ℹ️ [CRUZ-ROJA:${tipo.toUpperCase()}] Verificación omitida - config deshabilitada`)
  }
}
