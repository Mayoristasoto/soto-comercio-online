import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
}

interface AnotacionExcel {
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

export function AnotacionesSyncManager({ userInfo, isAdmin }: Props) {
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

      // Transformar datos a formato Excel
      const excelData = (anotaciones || []).map((a: any) => ({
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

      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 36 }, // id_anotacion (oculta)
        { wch: 12 }, // empleado_legajo
        { wch: 30 }, // empleado_nombre_completo
        { wch: 20 }, // categoria
        { wch: 40 }, // titulo
        { wch: 50 }, // descripcion
        { wch: 20 }, // fecha_anotacion
        { wch: 18 }, // requiere_seguimiento
        { wch: 20 }, // seguimiento_completado
        { wch: 12 }  // es_critica
      ]

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

      // Crear hoja de instrucciones
      const instrucciones = [
        ['INSTRUCCIONES DE USO'],
        [''],
        ['Este archivo está optimizado para Power Query y sincronización bidireccional.'],
        [''],
        ['PARA AGREGAR NUEVAS ANOTACIONES:'],
        ['1. Deja el campo "id_anotacion" vacío'],
        ['2. Completa empleado_legajo (debe existir en el sistema)'],
        ['3. Selecciona una categoría del menú desplegable'],
        ['4. Completa título (obligatorio, máximo 200 caracteres)'],
        ['5. Opcionalmente completa descripción'],
        ['6. Usa formato de fecha: DD/MM/YYYY HH:MM:SS o déjalo vacío para usar fecha actual'],
        ['7. Usa SI/NO en los campos booleanos'],
        [''],
        ['PARA MODIFICAR ANOTACIONES EXISTENTES:'],
        ['1. NO modifiques el campo "id_anotacion"'],
        ['2. Modifica solo los campos que desees cambiar'],
        ['3. Los cambios se detectarán automáticamente'],
        [''],
        ['PARA ELIMINAR ANOTACIONES:'],
        ['1. Simplemente elimina la fila completa del Excel'],
        ['2. El sistema detectará la ausencia y te pedirá confirmación'],
        [''],
        ['CATEGORÍAS VÁLIDAS:'],
        ...CATEGORIAS.map(c => [`- ${c}: ${CATEGORIAS_LABELS[c]}`]),
        [''],
        ['POWER QUERY:'],
        ['Este archivo está formateado como tabla de Excel para facilitar su uso con Power Query.'],
        ['Puedes aplicar transformaciones, filtros, y análisis antes de sincronizar.'],
        [''],
        ['IMPORTANTE:'],
        ['- NO modifiques empleado_nombre_completo (es solo informativo)'],
        ['- NO modifiques id_anotacion de registros existentes'],
        ['- Guarda el archivo como .xlsx antes de sincronizar'],
        [''],
        ['FECHA DE EXPORTACIÓN:', new Date().toLocaleString('es-AR')],
        ['USUARIO:', `${userInfo?.nombre} ${userInfo?.apellido}`]
      ]

      const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
      wsInstrucciones['!cols'] = [{ wch: 80 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

      // Descargar archivo
      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `anotaciones_empleados_${fecha}.xlsx`)

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${excelData.length} anotaciones a Excel`
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

    // Crear mapa de IDs en Excel
    const excelIds = new Set(
      excelData
        .map(a => a.id_anotacion)
        .filter(id => id && id.trim() !== '')
    )

    // Detectar eliminadas (en DB pero no en Excel)
    preview.eliminadas = dbData.filter(db => !excelIds.has(db.id))

    // Analizar cada fila del Excel
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i]
      const fila = i + 2 // +2 porque Excel empieza en 1 y tiene header

      try {
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

        // Si no tiene ID, es nueva
        if (!row.id_anotacion || row.id_anotacion.trim() === '') {
          preview.nuevas.push(row)
        } else {
          // Buscar en DB para ver si fue modificada
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
    <>
      <div className="flex gap-2">
        <Button
          onClick={exportToExcel}
          disabled={exporting}
          variant="outline"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exportando..." : "Exportar a Excel"}
        </Button>

        <Button
          onClick={() => document.getElementById('sync-file-input')?.click()}
          disabled={syncing}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {syncing ? "Analizando..." : "Sincronizar desde Excel"}
        </Button>

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
    </>
  )
}