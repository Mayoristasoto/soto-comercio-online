import { supabase } from "@/integrations/supabase/client"

interface TareaDiaria {
  id: string
  titulo: string
  descripcion?: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
}

interface EmpleadoInfo {
  id: string
  nombre: string
  apellido: string
  puesto?: string
}

// Función para generar el contenido HTML para impresora térmica de tickets
const generarHTMLTareasTermica = (empleado: EmpleadoInfo, tareas: TareaDiaria[], fecha: Date): string => {
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const horaFormateada = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const prioridadTexto = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return '!!! URGENTE'
      case 'alta': return '!! ALTA'
      case 'media': return '! MEDIA'
      case 'baja': return 'BAJA'
      default: return 'NORMAL'
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tareas - ${empleado.nombre} ${empleado.apellido}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 9pt;
          line-height: 1.3;
          color: #000;
          width: 80mm;
          padding: 5mm;
          background: white;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .divider-double {
          border-top: 2px solid #000;
          margin: 10px 0;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .header .subtitle {
          font-size: 9pt;
          margin-bottom: 2px;
        }
        .info-line {
          font-size: 8pt;
          margin: 2px 0;
        }
        .bold {
          font-weight: bold;
        }
        .center {
          text-align: center;
        }
        .section-title {
          font-size: 10pt;
          font-weight: bold;
          margin: 8px 0 6px 0;
          text-transform: uppercase;
        }
        .tarea {
          margin-bottom: 10px;
          padding: 6px 0;
          border-bottom: 1px solid #ddd;
        }
        .tarea:last-child {
          border-bottom: none;
        }
        .tarea-num {
          font-weight: bold;
          font-size: 10pt;
        }
        .tarea-titulo {
          font-weight: bold;
          margin: 3px 0;
          word-wrap: break-word;
        }
        .tarea-desc {
          font-size: 8pt;
          margin: 3px 0;
          word-wrap: break-word;
        }
        .tarea-prioridad {
          font-size: 8pt;
          font-weight: bold;
          margin: 2px 0;
        }
        .tarea-fecha {
          font-size: 7pt;
          font-style: italic;
          margin: 2px 0;
        }
        .checkbox {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #000;
          margin-right: 5px;
          vertical-align: middle;
        }
        .no-tareas {
          text-align: center;
          padding: 15px;
          font-style: italic;
        }
        .firma-section {
          margin-top: 15px;
          padding-top: 10px;
        }
        .firma-line {
          border-bottom: 1px solid #000;
          margin: 20px 0 5px 0;
        }
        .footer {
          margin-top: 15px;
          padding-top: 8px;
          border-top: 1px dashed #000;
          text-align: center;
          font-size: 7pt;
        }
        @media print {
          body {
            padding: 2mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TAREAS DIARIAS</h1>
        <div class="subtitle">Plan de Trabajo</div>
      </div>

      <div class="divider-double"></div>

      <div class="info-line bold">${empleado.nombre} ${empleado.apellido}</div>
      ${empleado.puesto ? `<div class="info-line">${empleado.puesto}</div>` : ''}
      <div class="info-line">${fechaFormateada} - ${horaFormateada}</div>

      <div class="divider-double"></div>

      ${tareas.length === 0 ? `
        <div class="no-tareas">
          <div class="bold">SIN TAREAS</div>
          <div>No hay tareas asignadas</div>
        </div>
      ` : `
        <div class="section-title">TAREAS (${tareas.length})</div>
        ${tareas.map((tarea, index) => `
          <div class="tarea">
            <div>
              <span class="checkbox"></span>
              <span class="tarea-num">${index + 1}.</span>
            </div>
            <div class="tarea-titulo">${tarea.titulo}</div>
            ${tarea.descripcion ? `
              <div class="tarea-desc">${tarea.descripcion}</div>
            ` : ''}
            <div class="tarea-prioridad">Prioridad: ${prioridadTexto(tarea.prioridad)}</div>
            ${tarea.fecha_limite ? `
              <div class="tarea-fecha">Vence: ${new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}</div>
            ` : ''}
          </div>
        `).join('')}
      `}

      <div class="divider-double"></div>

      <div class="firma-section">
        <div class="section-title">FIRMA</div>
        <div class="firma-line"></div>
        <div class="center info-line">Empleado - Fecha</div>
        
        <div class="firma-line" style="margin-top: 25px;"></div>
        <div class="center info-line">Supervisor - Fecha</div>
      </div>

      <div class="footer">
        <div>${new Date().toLocaleString('es-ES')}</div>
        <div>Sistema Kiosco CheckIn</div>
      </div>
    </body>
    </html>
  `
}

// Función para generar el contenido HTML para impresión A4
const generarHTMLTareasA4 = (empleado: EmpleadoInfo, tareas: TareaDiaria[], fecha: Date): string => {
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const prioridadEmoji = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return '🔴'
      case 'alta': return '🟠'
      case 'media': return '🟡'
      case 'baja': return '🟢'
      default: return '⚪'
    }
  }

  const prioridadTexto = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'URGENTE'
      case 'alta': return 'ALTA'
      case 'media': return 'MEDIA'
      case 'baja': return 'BAJA'
      default: return 'NORMAL'
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tareas Diarias - ${empleado.nombre} ${empleado.apellido}</title>
      <style>
        @page {
          margin: 20mm;
          size: A4;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: bold;
        }
        .header h2 {
          margin: 5px 0 0 0;
          font-size: 14pt;
          color: #666;
        }
        .empleado-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .empleado-info h3 {
          margin: 0 0 10px 0;
          font-size: 14pt;
        }
        .fecha {
          font-weight: bold;
          font-size: 12pt;
          color: #2563eb;
        }
        .tareas-container {
          margin-top: 20px;
        }
        .tarea {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        .tarea-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        .tarea-titulo {
          font-weight: bold;
          font-size: 12pt;
          flex: 1;
          margin-right: 10px;
        }
        .tarea-prioridad {
          padding: 4px 8px;
          border-radius: 15px;
          font-size: 9pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .prioridad-urgente {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }
        .prioridad-alta {
          background-color: #fed7aa;
          color: #ea580c;
          border: 1px solid #fdba74;
        }
        .prioridad-media {
          background-color: #fef3c7;
          color: #d97706;
          border: 1px solid #fcd34d;
        }
        .prioridad-baja {
          background-color: #dcfce7;
          color: #16a34a;
          border: 1px solid #86efac;
        }
        .tarea-descripcion {
          color: #666;
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .tarea-fecha-limite {
          font-size: 10pt;
          color: #888;
          font-style: italic;
        }
        .checkbox {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 2px solid #333;
          margin-right: 10px;
          vertical-align: middle;
        }
        .no-tareas {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 9pt;
          color: #999;
        }
        .completado-section {
          margin-top: 30px;
          border-top: 2px solid #ddd;
          padding-top: 20px;
        }
        .completado-title {
          font-weight: bold;
          margin-bottom: 15px;
          font-size: 12pt;
        }
        .firma-section {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
        }
        .firma-box {
          width: 200px;
          text-align: center;
        }
        .firma-line {
          border-bottom: 1px solid #333;
          margin-bottom: 5px;
          height: 40px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 TAREAS DIARIAS</h1>
        <h2>Plan de Trabajo</h2>
      </div>

      <div class="empleado-info">
        <h3>👤 ${empleado.nombre} ${empleado.apellido}</h3>
        ${empleado.puesto ? `<p><strong>Puesto:</strong> ${empleado.puesto}</p>` : ''}
        <p class="fecha">📅 ${fechaFormateada}</p>
      </div>

      <div class="tareas-container">
        ${tareas.length === 0 ? `
          <div class="no-tareas">
            <h3>🎉 ¡Sin tareas pendientes!</h3>
            <p>No tienes tareas asignadas para hoy. ¡Buen trabajo!</p>
          </div>
        ` : `
          <h3>📝 Tareas Pendientes (${tareas.length})</h3>
          ${tareas.map((tarea, index) => `
            <div class="tarea">
              <div class="tarea-header">
                <div class="tarea-titulo">
                  <span class="checkbox"></span>
                  ${index + 1}. ${tarea.titulo}
                </div>
                <div class="tarea-prioridad prioridad-${tarea.prioridad}">
                  ${prioridadEmoji(tarea.prioridad)} ${prioridadTexto(tarea.prioridad)}
                </div>
              </div>
              ${tarea.descripcion ? `
                <div class="tarea-descripcion">
                  <strong>Descripción:</strong> ${tarea.descripcion}
                </div>
              ` : ''}
              ${tarea.fecha_limite ? `
                <div class="tarea-fecha-limite">
                  ⏰ Fecha límite: ${new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        `}
      </div>

      <div class="completado-section">
        <div class="completado-title">✅ CONTROL DE FINALIZACIÓN</div>
        <div class="firma-section">
          <div class="firma-box">
            <div class="firma-line"></div>
            <p><strong>Empleado</strong><br>Firma y fecha</p>
          </div>
          <div class="firma-box">
            <div class="firma-line"></div>
            <p><strong>Supervisor</strong><br>Firma y fecha</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Documento generado automáticamente el ${new Date().toLocaleString('es-ES')}</p>
        <p>Sistema de Gestión de Tareas - Kiosco CheckIn</p>
      </div>
    </body>
    </html>
  `
}

// Función para generar HTML de una tarea individual (ticket separado)
const generarHTMLTareaIndividual = (empleado: EmpleadoInfo, tarea: TareaDiaria, fecha: Date, numeroTarea: number, totalTareas: number): string => {
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const horaFormateada = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const prioridadConfig = {
    urgente: { texto: 'URGENTE', simbolo: '!!!', color: '#dc2626', bgColor: '#fee2e2' },
    alta: { texto: 'ALTA', simbolo: '!!', color: '#ea580c', bgColor: '#fed7aa' },
    media: { texto: 'MEDIA', simbolo: '!', color: '#d97706', bgColor: '#fef3c7' },
    baja: { texto: 'BAJA', simbolo: '', color: '#16a34a', bgColor: '#dcfce7' }
  }

  const config = prioridadConfig[tarea.prioridad] || prioridadConfig.media

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tarea ${numeroTarea} - ${empleado.nombre} ${empleado.apellido}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 9pt;
          line-height: 1.3;
          color: #000;
          width: 80mm;
          padding: 5mm;
          background: white;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .divider-double {
          border-top: 2px solid #000;
          margin: 10px 0;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .header h1 {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .header .subtitle {
          font-size: 8pt;
          margin-bottom: 2px;
        }
        .destinatario-box {
          border: 2px solid #000;
          padding: 8px;
          margin: 8px 0;
          text-align: center;
          background: #f5f5f5;
        }
        .destinatario-label {
          font-size: 8pt;
          margin-bottom: 3px;
        }
        .destinatario-nombre {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .destinatario-puesto {
          font-size: 8pt;
          margin-top: 2px;
        }
        .tarea-numero {
          text-align: center;
          font-size: 8pt;
          margin: 5px 0;
        }
        .tarea-content {
          margin: 10px 0;
        }
        .tarea-titulo {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 6px;
          word-wrap: break-word;
        }
        .tarea-desc {
          font-size: 8pt;
          margin-bottom: 6px;
          word-wrap: break-word;
          line-height: 1.4;
        }
        .prioridad-box {
          display: inline-block;
          padding: 3px 8px;
          font-weight: bold;
          font-size: 9pt;
          margin: 5px 0;
        }
        .fecha-vence {
          font-size: 9pt;
          font-weight: bold;
          margin: 5px 0;
        }
        .confirmacion-section {
          margin-top: 10px;
          padding-top: 8px;
        }
        .confirmacion-title {
          font-size: 9pt;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .checkbox-item {
          margin: 5px 0;
          font-size: 8pt;
        }
        .checkbox {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #000;
          margin-right: 6px;
          vertical-align: middle;
        }
        .firma-section {
          margin-top: 12px;
        }
        .firma-line {
          border-bottom: 1px solid #000;
          margin: 18px 0 4px 0;
        }
        .firma-label {
          text-align: center;
          font-size: 7pt;
        }
        .footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px dashed #000;
          text-align: center;
          font-size: 7pt;
        }
        @media print {
          body {
            padding: 2mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 TAREA ASIGNADA</h1>
        <div class="subtitle">${fechaFormateada} - ${horaFormateada}</div>
      </div>

      <div class="divider-double"></div>

      <div class="destinatario-box">
        <div class="destinatario-label">PARA:</div>
        <div class="destinatario-nombre">${empleado.nombre} ${empleado.apellido}</div>
        ${empleado.puesto ? `<div class="destinatario-puesto">${empleado.puesto}</div>` : ''}
      </div>

      <div class="tarea-numero">Tarea ${numeroTarea} de ${totalTareas}</div>

      <div class="divider"></div>

      <div class="tarea-content">
        <div class="tarea-titulo">${tarea.titulo}</div>
        ${tarea.descripcion ? `<div class="tarea-desc">${tarea.descripcion}</div>` : ''}
        
        <div class="prioridad-box" style="background: ${config.bgColor}; color: ${config.color};">
          ${config.simbolo} ${config.texto}
        </div>
        
        ${tarea.fecha_limite ? `
          <div class="fecha-vence">
            ⏰ VENCE: ${new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}
          </div>
        ` : ''}
      </div>

      <div class="divider"></div>

      <div class="confirmacion-section">
        <div class="confirmacion-title">CONFIRMACIÓN</div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          Tarea recibida
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          Tarea completada
        </div>
      </div>

      <div class="firma-section">
        <div class="firma-line"></div>
        <div class="firma-label">Firma empleado</div>
      </div>

      <div class="footer">
        <div>Sistema Kiosco CheckIn</div>
      </div>
    </body>
    </html>
  `
}

// Función para obtener las tareas del empleado usando RPC (bypassa RLS)
const obtenerTareasEmpleado = async (empleadoId: string): Promise<TareaDiaria[]> => {
  const { data: tareas, error } = await supabase.rpc('kiosk_get_tareas', {
    p_empleado_id: empleadoId,
    p_limit: 20
  })

  if (error) {
    console.error('Error obteniendo tareas via RPC:', error)
    return []
  }

  return (tareas || []).map((t: { id: string; titulo: string; descripcion: string | null; prioridad: string; fecha_limite: string | null }) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion || undefined,
    prioridad: t.prioridad as TareaDiaria['prioridad'],
    fecha_limite: t.fecha_limite
  }))
}

// Función para verificar si es el primer check-in del día usando RPC (bypassa RLS)
export const esPrimerCheckinDelDia = async (empleadoId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('kiosk_es_primer_checkin_del_dia', {
    p_empleado_id: empleadoId
  })

  if (error) {
    console.error('Error verificando primer check-in via RPC:', error)
    return false
  }

  return data === true
}

// Función auxiliar para imprimir un ticket individual
const imprimirTicketIndividual = (htmlContent: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) {
      console.error('❌ No se pudo abrir ventana de impresión')
      resolve(false)
      return
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
          resolve(true)
        }, 500)
      }, 300)
    }
  })
}

// Función principal para imprimir tareas automáticamente (cada tarea en hoja separada)
export const imprimirTareasDiariasAutomatico = async (
  empleado: EmpleadoInfo, 
  tipoImpresora: 'termica' | 'a4' = 'termica'
): Promise<boolean> => {
  try {
    console.log('🖨️ Iniciando impresión automática de tareas para:', empleado.nombre)

    // Verificar si es el primer check-in del día
    const esPrimero = await esPrimerCheckinDelDia(empleado.id)
    if (!esPrimero) {
      console.log('❌ No es el primer check-in del día, no se imprime')
      return false
    }

    // Obtener tareas del empleado
    const tareas = await obtenerTareasEmpleado(empleado.id)
    console.log(`📋 Tareas encontradas: ${tareas.length}`)

    if (tareas.length === 0) {
      console.log('📋 No hay tareas para imprimir')
      return true
    }

    const fecha = new Date()

    // Imprimir cada tarea en un ticket separado
    for (let i = 0; i < tareas.length; i++) {
      const tarea = tareas[i]
      console.log(`🖨️ Imprimiendo tarea ${i + 1} de ${tareas.length}: ${tarea.titulo}`)
      
      const htmlContent = generarHTMLTareaIndividual(
        empleado, 
        tarea, 
        fecha, 
        i + 1, 
        tareas.length
      )
      
      await imprimirTicketIndividual(htmlContent)
      
      // Pausa entre impresiones para evitar problemas
      if (i < tareas.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ ${tareas.length} tickets enviados a impresora`)
    return true

  } catch (error) {
    console.error('❌ Error en impresión automática:', error)
    return false
  }
}

// Función para imprimir tareas todas juntas en un solo documento (versión legacy)
export const imprimirTareasDiariasAgrupadas = async (
  empleado: EmpleadoInfo, 
  tipoImpresora: 'termica' | 'a4' = 'termica'
): Promise<boolean> => {
  try {
    const esPrimero = await esPrimerCheckinDelDia(empleado.id)
    if (!esPrimero) {
      return false
    }

    const tareas = await obtenerTareasEmpleado(empleado.id)
    
    const htmlContent = tipoImpresora === 'termica' 
      ? generarHTMLTareasTermica(empleado, tareas, new Date())
      : generarHTMLTareasA4(empleado, tareas, new Date())

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      return false
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
        }, 1000)
      }, 500)
    }

    return true
  } catch (error) {
    console.error('❌ Error en impresión agrupada:', error)
    return false
  }
}

// Función para preview manual de las tareas (para testing)
export const previewTareasDiarias = async (
  empleado: EmpleadoInfo,
  tipoImpresora: 'termica' | 'a4' = 'termica'
): Promise<void> => {
  const tareas = await obtenerTareasEmpleado(empleado.id)
  const htmlContent = tipoImpresora === 'termica'
    ? generarHTMLTareasTermica(empleado, tareas, new Date())
    : generarHTMLTareasA4(empleado, tareas, new Date())
  
  const previewWindow = window.open('', '_blank', 'width=800,height=600')
  if (previewWindow) {
    previewWindow.document.write(htmlContent)
    previewWindow.document.close()
  }
}

// Función para preview de tareas individuales (para testing)
/**
 * Imprime tareas manualmente sin verificar si es el primer check-in
 * Útil para impresión bajo demanda desde el modal de tareas pendientes
 */
export const imprimirTareasManual = async (
  empleado: EmpleadoInfo,
  tareas: TareaDiaria[]
): Promise<boolean> => {
  if (!tareas || tareas.length === 0) {
    console.log('📋 No hay tareas para imprimir')
    return false
  }

  console.log(`🖨️ Imprimiendo ${tareas.length} tareas manualmente para ${empleado.nombre} ${empleado.apellido}`)

  const fechaActual = new Date()
  
  for (let i = 0; i < tareas.length; i++) {
    const tarea = tareas[i]
    const html = generarHTMLTareaIndividual(empleado, tarea, fechaActual, i + 1, tareas.length)
    
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
    
    // Pausa entre tickets
    if (i < tareas.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
  }

  console.log('✅ Impresión manual completada')
  return true
}

export const previewTareasIndividuales = async (
  empleado: EmpleadoInfo
): Promise<void> => {
  const tareas = await obtenerTareasEmpleado(empleado.id)
  const fecha = new Date()
  
  for (let i = 0; i < tareas.length; i++) {
    const htmlContent = generarHTMLTareaIndividual(empleado, tareas[i], fecha, i + 1, tareas.length)
    const previewWindow = window.open('', '_blank', 'width=400,height=600')
    if (previewWindow) {
      previewWindow.document.write(htmlContent)
      previewWindow.document.close()
    }
  }
}