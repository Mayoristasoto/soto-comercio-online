import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar, 
  Download, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  Edit3,
  Filter,
  Search
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
  formatArgentinaDate, 
  formatArgentinaTime,
  formatArgentinaDateTime,
  getArgentinaStartOfDay, 
  getArgentinaEndOfDay 
} from "@/lib/dateUtils"

interface AttendanceRecord {
  id: string
  empleado_id: string
  empleado_nombre: string
  empleado_apellido: string
  tipo: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  timestamp_real: string
  estado: string
  confianza_facial?: number
  latitud?: number
  longitud?: number
}

export default function AttendanceReports() {
  const { toast } = useToast()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [editingRecord, setEditingRecord] = useState(false)

  useEffect(() => {
    loadAttendanceRecords()
  }, [dateFilter])

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true)
      
      const startDate = getArgentinaStartOfDay(dateFilter)
      const endDate = getArgentinaEndOfDay(dateFilter)

      const { data, error } = await supabase
        .from('fichajes')
        .select(`
          id,
          empleado_id,
          tipo,
          timestamp_real,
          estado,
          confianza_facial,
          latitud,
          longitud,
          empleados!inner(nombre, apellido)
        `)
        .gte('timestamp_real', startDate)
        .lte('timestamp_real', endDate)
        .order('timestamp_real', { ascending: false })

      if (error) throw error

      const formattedRecords = data?.map(record => ({
        id: record.id,
        empleado_id: record.empleado_id,
        empleado_nombre: record.empleados.nombre,
        empleado_apellido: record.empleados.apellido,
        tipo: record.tipo,
        timestamp_real: record.timestamp_real,
        estado: record.estado,
        confianza_facial: record.confianza_facial,
        latitud: record.latitud,
        longitud: record.longitud
      })) || []

      setRecords(formattedRecords)
    } catch (error) {
      console.error('Error cargando registros:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros de asistencia",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Empleado',
      'Tipo',
      'Fecha',
      'Hora',
      'Estado',
      'Confianza Facial',
      'Ubicación'
    ]

    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        `"${record.empleado_nombre} ${record.empleado_apellido}"`,
        record.tipo,
        formatArgentinaDate(record.timestamp_real, 'dd/MM/yyyy'),
        formatArgentinaTime(record.timestamp_real),
        record.estado,
        record.confianza_facial ? `${(record.confianza_facial * 100).toFixed(1)}%` : 'N/A',
        record.latitud && record.longitud ? `${record.latitud}, ${record.longitud}` : 'Sin ubicación'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `asistencia_${dateFilter}.csv`
    link.click()

    toast({
      title: "Exportación exitosa",
      description: "El archivo CSV ha sido descargado",
    })
  }

  const updateRecord = async (recordId: string, newTimestamp: string) => {
    try {
      const { error } = await supabase
        .from('fichajes')
        .update({ 
          timestamp_real: newTimestamp,
          observaciones: 'Corregido manualmente por administrador'
        })
        .eq('id', recordId)

      if (error) throw error

      toast({
        title: "Registro actualizado",
        description: "El horario ha sido corregido exitosamente",
      })

      loadAttendanceRecords()
      setEditingRecord(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error('Error actualizando registro:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro",
        variant: "destructive"
      })
    }
  }

  const filteredRecords = records.filter(record => 
    `${record.empleado_nombre} ${record.empleado_apellido}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'salida': return <XCircle className="h-4 w-4 text-red-600" />
      case 'pausa_inicio': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'pausa_fin': return <Clock className="h-4 w-4 text-blue-600" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getTypeBadge = (tipo: string) => {
    const configs = {
      entrada: { label: 'Entrada', variant: 'default' as const },
      salida: { label: 'Salida', variant: 'destructive' as const },
      pausa_inicio: { label: 'Pausa Inicio', variant: 'secondary' as const },
      pausa_fin: { label: 'Pausa Fin', variant: 'outline' as const }
    }
    
    const config = configs[tipo as keyof typeof configs] || { label: tipo, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando registros de asistencia...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Reportes de Asistencia</span>
          </CardTitle>
          <CardDescription>
            Gestiona y exporta los registros de asistencia del personal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles de filtrado */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
            />
            <Button onClick={exportToCSV} className="whitespace-nowrap">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Estadísticas del día */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-green-600 text-sm font-medium">Entradas</div>
              <div className="text-2xl font-bold text-green-700">
                {filteredRecords.filter(r => r.tipo === 'entrada').length}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-red-600 text-sm font-medium">Salidas</div>
              <div className="text-2xl font-bold text-red-700">
                {filteredRecords.filter(r => r.tipo === 'salida').length}
              </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-yellow-600 text-sm font-medium">Pausas</div>
              <div className="text-2xl font-bold text-yellow-700">
                {filteredRecords.filter(r => r.tipo === 'pausa_inicio').length}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-600 text-sm font-medium">Total Registros</div>
              <div className="text-2xl font-bold text-blue-700">
                {filteredRecords.length}
              </div>
            </div>
          </div>

          {/* Lista de registros */}
          <div className="border rounded-lg">
            <div className="max-h-96 overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay registros para la fecha seleccionada
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRecords.map((record) => (
                    <div key={record.id} className="p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(record.tipo)}
                          <div>
                            <div className="font-medium">
                              {record.empleado_nombre} {record.empleado_apellido}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatArgentinaDateTime(record.timestamp_real, 'dd/MM/yyyy HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getTypeBadge(record.tipo)}
                          
                          {record.confianza_facial && (
                            <Badge variant="outline">
                              {(record.confianza_facial * 100).toFixed(1)}%
                            </Badge>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRecord(record)
                              setEditingRecord(true)
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de edición */}
      {editingRecord && selectedRecord && (
        <Card>
          <CardHeader>
            <CardTitle>Corregir Registro</CardTitle>
            <CardDescription>
              Editando registro de {selectedRecord.empleado_nombre} {selectedRecord.empleado_apellido}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nueva fecha y hora:</label>
              <Input
                type="datetime-local"
                defaultValue={format(new Date(selectedRecord.timestamp_real), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => {
                  const newTimestamp = new Date(e.target.value).toISOString()
                  updateRecord(selectedRecord.id, newTimestamp)
                }}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRecord(false)
                  setSelectedRecord(null)
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}