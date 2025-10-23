import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import * as XLSX from 'xlsx'

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  rol: string
  sucursal_id?: string
}

interface Props {
  userInfo: UserInfo | null
  isAdmin: boolean
  onSyncComplete?: () => void
}

interface AnotacionExcel {
  accion?: string // "nueva", "actualizar", "eliminar"
  id_anotacion?: string
  empleado_legajo: string
  empleado_nombre_completo: string
  categoria: string
  titulo: string
  descripcion: string
  fecha_anotacion: string
  requiere_seguimiento: string
  seguimiento_completado: string
  es_critica: string
}

interface SyncChange {
  tipo: 'nueva' | 'modificada' | 'eliminada'
  data: any
  cambios?: string[]
  error?: string
}

interface SyncPreview {
  nuevas: AnotacionExcel[]
  modificadas: { original: any, modificada: AnotacionExcel, cambios: string[] }[]
  eliminadas: any[]
  sinCambios: number
  errores: { fila: number, error: string }[]
}

const CATEGORIAS = [
  "apercibimiento",
  "llamado_atencion",
  "orden_no_acatada",
  "no_uso_uniforme",
  "uso_celular",
  "tardanza",
  "ausencia_injustificada",
  "actitud_positiva",
  "mejora_desempeno",
  "otro"
]

const CATEGORIAS_LABELS: Record<string, string> = {
  "apercibimiento": "Apercibimiento",
  "llamado_atencion": "Llamado de Atención",
  "orden_no_acatada": "Orden No Acatada",
  "no_uso_uniforme": "No Uso de Uniforme",
  "uso_celular": "Uso de Celular",
  "tardanza": "Tardanza",
  "ausencia_injustificada": "Ausencia Injustificada",
  "actitud_positiva": "Actitud Positiva",
  "mejora_desempeno": "Mejora en Desempeño",
  "otro": "Otro"
}

export function AnotacionesSyncManager({ userInfo, isAdmin, onSyncComplete }: Props) {
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null)
  const { toast } = useToast()

  const exportToExcel = async () => {
    try {
      setExporting(true)

      // Obtener todas las anotaciones con datos del empleado y creador
      const { data: anotaciones, error } = await supabase
        .from('empleados_anotaciones')
        .select(`
          id,
          empleado_id,
          empleados!empleados_anotaciones_empleado_id_fkey (
            legajo,
            nombre,
            apellido
          ),
          categoria,
          titulo,
          descripcion,
          fecha_anotacion,
          requiere_seguimiento,
          seguimiento_completado,
          es_critica,
          created_at,
          updated_at
        `)
        .order('fecha_anotacion', { ascending: false })

      if (error) throw error

      // Preparar datos para Excel con columna accion
      const excelData = (anotaciones || []).map((a: any) => ({
        accion: '',
        id_anotacion: a.id,
        empleado_legajo: a.empleados?.legajo || '',
        empleado_nombre_completo: `${a.empleados?.apellido || ''}, ${a.empleados?.nombre || ''}`,
        categoria: a.categoria,
        titulo: a.titulo,
        descripcion: a.descripcion || '',
        fecha_anotacion: new Date(a.fecha_anotacion).toLocaleString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        requiere_seguimiento: a.requiere_seguimiento ? 'SI' : 'NO',
        seguimiento_completado: a.seguimiento_completado ? 'SI' : 'NO',
        es_critica: a.es_critica ? 'SI' : 'NO'
      }))

      // Crear workbook
      const wb = XLSX.utils.book_new()
      
      // Crear worksheet con los datos
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Configurar anchos de columna OPTIMIZADOS
      ws['!cols'] = [
        { wch: 14 }, // accion (NUEVA COLUMNA)
        { wch: 38 }, // id_anotacion (UUID completo)
        { wch: 15 }, // empleado_legajo
        { wch: 35 }, // empleado_nombre_completo
        { wch: 25 }, // categoria
        { wch: 45 }, // titulo
        { wch: 60 }, // descripcion (más ancho para mayor legibilidad)
        { wch: 22 }, // fecha_anotacion
        { wch: 20 }, // requiere_seguimiento
        { wch: 22 }, // seguimiento_completado
        { wch: 14 }  // es_critica
      ]

      // Aplicar formato a los encabezados (primera fila)
      const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1']
      headerCells.forEach(cell => {
        if (!ws[cell]) return
        ws[cell].s = {
          font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        }
      })

      // Congelar primera fila
      ws['!freeze'] = { xSplit: 0, ySplit: 1 }

      // Convertir a Tabla de Excel (esencial para Power Query)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      ws['!tables'] = [{
        name: 'TablaAnotaciones',
        ref: ws['!ref'],
        headerRowCount: 1,
        totalsRowCount: 0,
        style: {
          theme: 'TableStyleMedium2',
          showFirstColumn: false,
          showLastColumn: false,
          showRowStripes: true,
          showColumnStripes: false
        }
      }]

      // Agregar filtro automático
      ws['!autofilter'] = { ref: ws['!ref'] }

      // Agregar validación de datos para columna categoria (columna D, comenzando en fila 2)
      const categoriaCol = 'D'
      const maxRows = excelData.length + 100 // Permitir agregar más filas
      
      // Validación para categoría
      ws['!dataValidation'] = ws['!dataValidation'] || []
      for (let row = 2; row <= maxRows; row++) {
        ws['!dataValidation'].push({
          type: 'list',
          allowBlank: false,
          showDropDown: true,
          formulae: [`"${CATEGORIAS.join(',')}"`],
          sqref: `${categoriaCol}${row}`
        })
        
        // Validación para SI/NO en columnas H, I, J
        const siNoColumns = ['H', 'I', 'J']
        for (const col of siNoColumns) {
          ws['!dataValidation'].push({
            type: 'list',
            allowBlank: false,
            showDropDown: true,
            formulae: ['"SI,NO"'],
            sqref: `${col}${row}`
          })
        }
      }

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Anotaciones')

      // Crear hoja de instrucciones MEJORADA
      const instrucciones = [
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        ['               📋 SISTEMA DE ANOTACIONES - GUÍA RÁPIDA DE USO 📋                    '],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['🚀 INICIO RÁPIDO - 3 PASOS SIMPLES'],
        [''],
        ['  1️⃣  Descarga este archivo Excel'],
        ['  2️⃣  Agrega/edita anotaciones en la pestaña "Anotaciones"'],
        ['  3️⃣  Sube el archivo usando el botón "Sincronizar" en la aplicación'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['📝 CÓMO AGREGAR UNA NUEVA ANOTACIÓN'],
        [''],
        ['  1. Ve a la pestaña "Anotaciones"'],
        ['  2. En una fila NUEVA, completa:'],
        ['     • empleado_legajo: Escribe el número de legajo del empleado'],
        ['     • categoria: Selecciona del menú desplegable (click en celda)'],
        ['     • titulo: Escribe un título descriptivo (máx. 200 caracteres)'],
        ['     • descripcion: Opcional, agrega detalles adicionales'],
        ['     • fecha_anotacion: Déjalo vacío para usar fecha actual'],
        ['     • requiere_seguimiento: SI o NO (menú desplegable)'],
        ['     • seguimiento_completado: SI o NO (menú desplegable)'],
        ['     • es_critica: SI o NO (menú desplegable)'],
        [''],
        ['  3. IMPORTANTE: Deja la columna "id_anotacion" VACÍA (se genera automático)'],
        ['  4. NO edites "empleado_nombre_completo" (solo informativo)'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['✏️ CÓMO MODIFICAR UNA ANOTACIÓN EXISTENTE'],
        [''],
        ['  1. Encuentra la fila que quieres modificar'],
        ['  2. NO cambies el "id_anotacion" (identifica el registro único)'],
        ['  3. Modifica los campos que necesites'],
        ['  4. Al sincronizar, se detectarán los cambios automáticamente'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['🗑️ CÓMO ELIMINAR UNA ANOTACIÓN'],
        [''],
        ['  1. Selecciona la fila completa que quieres eliminar'],
        ['  2. Click derecho > Eliminar (o Delete)'],
        ['  3. Al sincronizar, se pedirá confirmación antes de eliminar de la BD'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['📋 CATEGORÍAS DISPONIBLES (Usar en columna "categoria")'],
        [''],
        ['  Código                    │  Descripción'],
        ['  ──────────────────────────┼─────────────────────────────'],
        ...CATEGORIAS.map(c => [`  ${c.padEnd(26)}│  ${CATEGORIAS_LABELS[c]}`]),
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['⚠️ VALIDACIONES AUTOMÁTICAS'],
        [''],
        ['  ✓ Legajo: Debe existir en el sistema'],
        ['  ✓ Categoría: Debe ser una de las listadas arriba'],
        ['  ✓ Título: Obligatorio, máximo 200 caracteres'],
        ['  ✓ Fecha: Formato DD/MM/YYYY HH:MM:SS (opcional)'],
        ['  ✓ Campos SI/NO: Solo acepta "SI" o "NO"'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['💡 TIPS Y TRUCOS'],
        [''],
        ['  • Usa los menús desplegables para evitar errores de escritura'],
        ['  • Puedes copiar y pegar filas para duplicar anotaciones similares'],
        ['  • El filtro automático te permite buscar por categoría, empleado, etc.'],
        ['  • Guarda siempre como .xlsx antes de sincronizar'],
        ['  • Si hay errores, la sincronización te mostrará qué filas tienen problemas'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['📊 INTEGRACIÓN CON POWER QUERY (AVANZADO)'],
        [''],
        ['  Si quieres conectar este archivo a Power BI o hacer análisis avanzados:'],
        [''],
        ['  1. Excel: Datos > Obtener datos > Desde archivo > Desde libro'],
        ['  2. Selecciona este archivo'],
        ['  3. Elige "TablaAnotaciones" en el navegador'],
        ['  4. Click "Cargar" para importar'],
        [''],
        ['  La tabla se llama "TablaAnotaciones" y está formateada para Power Query.'],
        ['  Puedes actualizar los datos en cualquier momento con "Actualizar todo".'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['📈 INFORMACIÓN DEL ARCHIVO'],
        [''],
        ['  Exportado:    ' + new Date().toLocaleString('es-AR', {
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })],
        ['  Usuario:      ' + `${userInfo?.nombre} ${userInfo?.apellido}`],
        ['  Rol:          ' + userInfo?.rol],
        ['  Registros:    ' + excelData.length.toString()],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['❓ ¿NECESITAS AYUDA?'],
        [''],
        ['  Contacta al equipo de RRHH o consulta la documentación del sistema.'],
        ['  Recuerda: Siempre haz una copia de respaldo antes de hacer cambios masivos.'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════']
      ]

      const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
      wsInstrucciones['!cols'] = [{ wch: 90 }]
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, '📖 Guía de Uso')

      // Crear hoja de EJEMPLOS
      const ejemplos = [
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        ['                           📝 EJEMPLOS PRÁCTICOS 📝                                 '],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['A continuación encontrarás ejemplos de cómo completar las anotaciones:'],
        [''],
        ['EJEMPLO 1: Agregar una nueva anotación (Apercibimiento)'],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['accion:                    nueva'],
        ['id_anotacion:              (DEJAR VACÍO - se genera automáticamente)'],
        ['empleado_legajo:           1234'],
        ['empleado_nombre_completo:  (NO EDITAR - se completa automático)'],
        ['categoria:                 apercibimiento'],
        ['titulo:                    Uso de celular durante horario laboral'],
        ['descripcion:               El empleado fue observado utilizando el celular personal'],
        ['                           durante su turno en el área de atención al cliente.'],
        ['fecha_anotacion:           (VACÍO para usar fecha actual)'],
        ['requiere_seguimiento:      SI'],
        ['seguimiento_completado:    NO'],
        ['es_critica:                NO'],
        [''],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['EJEMPLO 2: Reconocimiento positivo'],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['accion:                    nueva'],
        ['id_anotacion:              (DEJAR VACÍO)'],
        ['empleado_legajo:           5678'],
        ['empleado_nombre_completo:  (NO EDITAR)'],
        ['categoria:                 actitud_positiva'],
        ['titulo:                    Excelente atención al cliente'],
        ['descripcion:               Múltiples clientes destacaron la amabilidad y eficiencia'],
        ['                           en la atención. Superó las expectativas del rol.'],
        ['fecha_anotacion:           (VACÍO)'],
        ['requiere_seguimiento:      NO'],
        ['seguimiento_completado:    NO'],
        ['es_critica:                NO'],
        [''],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['EJEMPLO 3: Ausencia injustificada'],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['accion:                    nueva'],
        ['id_anotacion:              (DEJAR VACÍO)'],
        ['empleado_legajo:           9012'],
        ['empleado_nombre_completo:  (NO EDITAR)'],
        ['categoria:                 ausencia_injustificada'],
        ['titulo:                    Inasistencia sin aviso previo'],
        ['descripcion:               El empleado no se presentó a su turno del día 15/01/2025'],
        ['                           y no realizó ninguna comunicación previa o posterior.'],
        ['fecha_anotacion:           15/01/2025 08:00:00'],
        ['requiere_seguimiento:      SI'],
        ['seguimiento_completado:    NO'],
        ['es_critica:                SI'],
        [''],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['EJEMPLO 4: Modificar una anotación existente'],
        ['───────────────────────────────────────────────────────────────────────────────────'],
        [''],
        ['Para modificar una anotación:'],
        ['  1. Escribe "actualizar" en la columna "accion"'],
        ['  2. Busca la fila con el id_anotacion que quieres modificar'],
        ['  3. NO cambies el id_anotacion'],
        ['  4. Modifica solo los campos necesarios'],
        [''],
        ['Ejemplo: Marcar seguimiento como completado'],
        [''],
        ['accion:                    actualizar'],
        ['id_anotacion:              550e8400-e29b-41d4-a716-446655440000 (NO CAMBIAR)'],
        ['empleado_legajo:           1234 (no tocar si no es necesario)'],
        ['categoria:                 apercibimiento (igual)'],
        ['titulo:                    Uso de celular... (igual)'],
        ['descripcion:               (igual o agregar más info)'],
        ['fecha_anotacion:           (igual)'],
        ['requiere_seguimiento:      SI (igual)'],
        ['seguimiento_completado:    SI ← CAMBIAR DE NO A SI'],
        ['es_critica:                NO (igual)'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════'],
        [''],
        ['💡 RECUERDA:'],
        [''],
        ['  • Los menús desplegables te ayudan a evitar errores'],
        ['  • Siempre guarda el archivo antes de sincronizar'],
        ['  • Puedes agregar múltiples anotaciones de una vez'],
        ['  • La aplicación validará todos los datos antes de sincronizar'],
        [''],
        ['═══════════════════════════════════════════════════════════════════════════════════']
      ]

      const wsEjemplos = XLSX.utils.aoa_to_sheet(ejemplos)
      wsEjemplos['!cols'] = [{ wch: 90 }]
      XLSX.utils.book_append_sheet(wb, wsEjemplos, '💡 Ejemplos')

      // Descargar archivo
      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `anotaciones_empleados_${fecha}.xlsx`)

      toast({
        title: "✅ Excel generado exitosamente",
        description: (
          <div className="space-y-2">
            <p><strong>{excelData.length} anotaciones</strong> exportadas</p>
            <div className="text-sm mt-2 space-y-1">
              <p>📋 <strong>3 pestañas incluidas:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Anotaciones:</strong> Datos actuales (editable)</li>
                <li><strong>📖 Guía de Uso:</strong> Instrucciones paso a paso</li>
                <li><strong>💡 Ejemplos:</strong> Casos prácticos</li>
              </ul>
              <p className="mt-2"><strong>Próximo paso:</strong> Edita el Excel y súbelo con "Sincronizar"</p>
            </div>
          </div>
        )
      })
    } catch (error) {
      console.error('Error exporting:', error)
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setSyncing(true)

      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: AnotacionExcel[] = XLSX.utils.sheet_to_json(worksheet)

      // Obtener anotaciones actuales de la BD
      const { data: anotacionesDB, error } = await supabase
        .from('empleados_anotaciones')
        .select(`
          *,
          empleados!empleados_anotaciones_empleado_id_fkey (
            legajo,
            nombre,
            apellido
          )
        `)

      if (error) throw error

      // Analizar cambios
      const preview = await analizarCambios(jsonData, anotacionesDB || [])
      setSyncPreview(preview)
      setShowPreview(true)

    } catch (error) {
      console.error('Error reading file:', error)
      toast({
        title: "Error",
        description: "No se pudo leer el archivo Excel",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
      // Reset input
      e.target.value = ''
    }
  }

  const analizarCambios = async (excelData: AnotacionExcel[], dbData: any[]): Promise<SyncPreview> => {
    const preview: SyncPreview = {
      nuevas: [],
      modificadas: [],
      eliminadas: [],
      sinCambios: 0,
      errores: []
    }

    // Crear mapas de IDs en Excel según acción
    const excelIds = new Set<string>()
    const idsAEliminar = new Set<string>()

    // Analizar cada fila del Excel
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i]
      const fila = i + 2 // +2 porque Excel empieza en 1 y tiene header
      const accion = row.accion?.toLowerCase().trim() || ''

      try {
        // Si la acción es eliminar, agregar al set de eliminación
        if (accion === 'eliminar') {
          if (!row.id_anotacion || row.id_anotacion.trim() === '') {
            preview.errores.push({
              fila,
              error: 'Para eliminar necesitas especificar el ID de la anotación'
            })
            continue
          }
          idsAEliminar.add(row.id_anotacion)
          continue
        }

        // Agregar ID al set de IDs existentes en Excel (si no es eliminar)
        if (row.id_anotacion && row.id_anotacion.trim() !== '') {
          excelIds.add(row.id_anotacion)
        }

        // Validar campos obligatorios
        if (!row.empleado_legajo || !row.categoria || !row.titulo) {
          preview.errores.push({
            fila,
            error: 'Faltan campos obligatorios (legajo, categoría o título)'
          })
          continue
        }

        // Validar categoría
        if (!CATEGORIAS.includes(row.categoria)) {
          preview.errores.push({
            fila,
            error: `Categoría inválida: "${row.categoria}". Debe ser una de: ${CATEGORIAS.join(', ')}`
          })
          continue
        }

        // Validar longitud del título
        if (row.titulo.length > 200) {
          preview.errores.push({
            fila,
            error: 'El título no puede superar los 200 caracteres'
          })
          continue
        }

        // Determinar si es nueva o modificada
        const esNueva = !row.id_anotacion || row.id_anotacion.trim() === '' || accion === 'nueva'
        
        if (esNueva) {
          preview.nuevas.push(row)
        } else if (accion === 'actualizar' || accion === '') {
          // Buscar en DB para ver si existe y comparar
          const original = dbData.find(db => db.id === row.id_anotacion)
          
          if (!original) {
            preview.errores.push({
              fila,
              error: `No se encontró anotación con ID: ${row.id_anotacion}`
            })
            continue
          }

          // Comparar campos
          const cambios: string[] = []
          
          if (original.categoria !== row.categoria) {
            cambios.push(`Categoría: "${original.categoria}" → "${row.categoria}"`)
          }
          if (original.titulo !== row.titulo) {
            cambios.push(`Título: "${original.titulo}" → "${row.titulo}"`)
          }
          if ((original.descripcion || '') !== (row.descripcion || '')) {
            cambios.push('Descripción modificada')
          }
          
          const requiereSeguimientoExcel = row.requiere_seguimiento?.toUpperCase() === 'SI'
          if (original.requiere_seguimiento !== requiereSeguimientoExcel) {
            cambios.push(`Requiere seguimiento: ${original.requiere_seguimiento ? 'SI' : 'NO'} → ${requiereSeguimientoExcel ? 'SI' : 'NO'}`)
          }
          
          const seguimientoCompletadoExcel = row.seguimiento_completado?.toUpperCase() === 'SI'
          if (original.seguimiento_completado !== seguimientoCompletadoExcel) {
            cambios.push(`Seguimiento completado: ${original.seguimiento_completado ? 'SI' : 'NO'} → ${seguimientoCompletadoExcel ? 'SI' : 'NO'}`)
          }
          
          const esCriticaExcel = row.es_critica?.toUpperCase() === 'SI'
          if (original.es_critica !== esCriticaExcel) {
            cambios.push(`Es crítica: ${original.es_critica ? 'SI' : 'NO'} → ${esCriticaExcel ? 'SI' : 'NO'}`)
          }

          if (cambios.length > 0) {
            preview.modificadas.push({ original, modificada: row, cambios })
          } else {
            preview.sinCambios++
          }
        }
      } catch (error) {
        preview.errores.push({
          fila,
          error: `Error al procesar fila: ${error}`
        })
      }
    }

    // Detectar eliminadas: IDs explícitamente marcados para eliminar + IDs que no están en Excel
    const eliminadasExplicitas = dbData.filter(db => idsAEliminar.has(db.id))
    const eliminadasImplicitas = dbData.filter(db => !excelIds.has(db.id) && !idsAEliminar.has(db.id))
    
    preview.eliminadas = [...eliminadasExplicitas, ...eliminadasImplicitas]

    return preview
  }

  const aplicarSincronizacion = async () => {
    if (!syncPreview || !userInfo) return

    try {
      setSyncing(true)
      let creadas = 0
      let modificadas = 0
      let eliminadas = 0
      const errores: string[] = []

      // Crear nuevas anotaciones
      for (const nueva of syncPreview.nuevas) {
        try {
          // Buscar empleado por legajo
          const { data: empleado, error: empError } = await supabase
            .from('empleados')
            .select('id')
            .eq('legajo', nueva.empleado_legajo)
            .eq('activo', true)
            .single()

          if (empError || !empleado) {
            errores.push(`No se encontró empleado con legajo: ${nueva.empleado_legajo}`)
            continue
          }

          // Parsear fecha si existe
          let fechaAnotacion = new Date()
          if (nueva.fecha_anotacion) {
            const parsed = new Date(nueva.fecha_anotacion)
            if (!isNaN(parsed.getTime())) {
              fechaAnotacion = parsed
            }
          }

          const { error: insertError } = await supabase
            .from('empleados_anotaciones')
            .insert({
              empleado_id: empleado.id,
              creado_por: userInfo.id,
              categoria: nueva.categoria as any,
              titulo: nueva.titulo,
              descripcion: nueva.descripcion || null,
              fecha_anotacion: fechaAnotacion.toISOString(),
              requiere_seguimiento: nueva.requiere_seguimiento?.toUpperCase() === 'SI',
              seguimiento_completado: nueva.seguimiento_completado?.toUpperCase() === 'SI',
              es_critica: nueva.es_critica?.toUpperCase() === 'SI'
            })

          if (insertError) {
            errores.push(`Error al crear anotación para ${nueva.empleado_legajo}: ${insertError.message}`)
          } else {
            creadas++
          }
        } catch (error) {
          errores.push(`Error procesando ${nueva.empleado_legajo}: ${error}`)
        }
      }

      // Modificar existentes
      for (const mod of syncPreview.modificadas) {
        try {
          const { error: updateError } = await supabase
            .from('empleados_anotaciones')
            .update({
              categoria: mod.modificada.categoria as any,
              titulo: mod.modificada.titulo,
              descripcion: mod.modificada.descripcion || null,
              requiere_seguimiento: mod.modificada.requiere_seguimiento?.toUpperCase() === 'SI',
              seguimiento_completado: mod.modificada.seguimiento_completado?.toUpperCase() === 'SI',
              es_critica: mod.modificada.es_critica?.toUpperCase() === 'SI'
            })
            .eq('id', mod.modificada.id_anotacion)

          if (updateError) {
            errores.push(`Error al modificar anotación ${mod.modificada.id_anotacion}: ${updateError.message}`)
          } else {
            modificadas++
          }
        } catch (error) {
          errores.push(`Error modificando ${mod.modificada.id_anotacion}: ${error}`)
        }
      }

      // Eliminar anotaciones
      for (const del of syncPreview.eliminadas) {
        try {
          const { error: deleteError } = await supabase
            .from('empleados_anotaciones')
            .delete()
            .eq('id', del.id)

          if (deleteError) {
            errores.push(`Error al eliminar anotación ${del.id}: ${deleteError.message}`)
          } else {
            eliminadas++
          }
        } catch (error) {
          errores.push(`Error eliminando ${del.id}: ${error}`)
        }
      }

      // Mostrar resultado
      toast({
        title: "Sincronización completada",
        description: `✅ ${creadas} creadas | 🔄 ${modificadas} modificadas | ❌ ${eliminadas} eliminadas ${errores.length > 0 ? `| ⚠️ ${errores.length} errores` : ''}`
      })

      if (errores.length > 0) {
        console.error('Errores durante sincronización:', errores)
      }

      setShowPreview(false)
      setSyncPreview(null)
      
      // Notificar que la sincronización se completó
      if (onSyncComplete) {
        onSyncComplete()
      }

    } catch (error) {
      console.error('Error en sincronización:', error)
      toast({
        title: "Error",
        description: "No se pudo completar la sincronización",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  if (!isAdmin) return null

  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={exportToExcel}
              disabled={exporting}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Descargar Excel"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold mb-1">📥 Descargar plantilla editable</p>
            <p className="text-sm">Incluye todas las anotaciones actuales, instrucciones detalladas y ejemplos prácticos. Edita el archivo y súbelo para sincronizar cambios.</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => document.getElementById('sync-file-input')?.click()}
              disabled={syncing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {syncing ? "Analizando..." : "Subir y Sincronizar"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold mb-1">📤 Sincronizar cambios</p>
            <p className="text-sm">Sube el Excel editado. Se analizarán todos los cambios (nuevas, modificadas, eliminadas) y podrás revisarlos antes de aplicarlos.</p>
          </TooltipContent>
        </Tooltip>

        <input
          id="sync-file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Dialog de preview de sincronización */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Vista Previa de Sincronización
            </DialogTitle>
            <DialogDescription>
              Revisa los cambios antes de aplicarlos. Puedes cancelar si algo no está correcto.
            </DialogDescription>
          </DialogHeader>

          {syncPreview && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Nuevas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                    {syncPreview.nuevas.length}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Modificadas</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                    {syncPreview.modificadas.length}
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Eliminadas</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-2">
                    {syncPreview.eliminadas.length}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Sin cambios</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                    {syncPreview.sinCambios}
                  </p>
                </div>
              </div>

              {/* Errores */}
              {syncPreview.errores.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errores encontrados</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {syncPreview.errores.slice(0, 5).map((err, idx) => (
                        <li key={idx}>
                          Fila {err.fila}: {err.error}
                        </li>
                      ))}
                      {syncPreview.errores.length > 5 && (
                        <li>... y {syncPreview.errores.length - 5} errores más</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Detalles de cambios */}
              {syncPreview.nuevas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Anotaciones Nuevas ({syncPreview.nuevas.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Legajo</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Crítica</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncPreview.nuevas.slice(0, 5).map((n, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{n.empleado_legajo}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{CATEGORIAS_LABELS[n.categoria] || n.categoria}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{n.titulo}</TableCell>
                            <TableCell>{n.es_critica}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {syncPreview.nuevas.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                        ... y {syncPreview.nuevas.length - 5} más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {syncPreview.modificadas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Anotaciones Modificadas ({syncPreview.modificadas.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Cambios</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncPreview.modificadas.slice(0, 5).map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {m.original.empleados?.apellido}, {m.original.empleados?.nombre}
                            </TableCell>
                            <TableCell>
                              <ul className="list-disc list-inside text-sm">
                                {m.cambios.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {syncPreview.modificadas.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                        ... y {syncPreview.modificadas.length - 5} más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {syncPreview.eliminadas.length > 0 && (
                <Alert variant="destructive">
                  <Trash2 className="h-4 w-4" />
                  <AlertTitle>Se eliminarán {syncPreview.eliminadas.length} anotaciones</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">Las siguientes anotaciones están en la base de datos pero no en tu Excel:</p>
                    <ul className="list-disc list-inside">
                      {syncPreview.eliminadas.slice(0, 3).map((d, idx) => (
                        <li key={idx}>
                          {d.empleados?.apellido}, {d.empleados?.nombre} - {d.titulo}
                        </li>
                      ))}
                      {syncPreview.eliminadas.length > 3 && (
                        <li>... y {syncPreview.eliminadas.length - 3} más</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false)
                    setSyncPreview(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={aplicarSincronizacion}
                  disabled={syncing || (syncPreview.errores.length > 0 && syncPreview.nuevas.length === 0 && syncPreview.modificadas.length === 0)}
                >
                  {syncing ? "Sincronizando..." : "Aplicar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}