import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Users, Search, ArrowRight, Check, X, FileText, Download } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { ExportButton } from "@/components/ui/export-button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  legajo: string
  email: string
  avatar_url?: string
  sucursal_id?: string
  puesto?: string
  sucursal?: {
    id: string
    nombre: string
  }
}

interface Sucursal {
  id: string
  nombre: string
  direccion?: string
  ciudad?: string
  activa: boolean
}

export default function EmpleadosSucursalAssignment() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [selectedEmpleados, setSelectedEmpleados] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSucursal, setFilterSucursal] = useState<string>("all")
  const [targetSucursal, setTargetSucursal] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar sucursales
      const { data: sucursalesData, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('*')
        .eq('activa', true)
        .order('nombre')

      if (sucursalesError) throw sucursalesError
      setSucursales(sucursalesData || [])

      // Cargar empleados con sus sucursales
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select(`
          id,
          nombre,
          apellido,
          legajo,
          email,
          avatar_url,
          puesto,
          sucursal_id,
          sucursales:sucursal_id (
            id,
            nombre
          )
        `)
        .eq('activo', true)
        .order('apellido')

      if (empleadosError) throw empleadosError

      const formattedEmpleados = empleadosData?.map(emp => ({
        ...emp,
        sucursal: Array.isArray(emp.sucursales) ? emp.sucursales[0] : emp.sucursales
      })) || []

      setEmpleados(formattedEmpleados)

    } catch (error: any) {
      console.error('Error cargando datos:', error)
      toast.error("Error al cargar datos: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEmpleado = (empleadoId: string) => {
    setSelectedEmpleados(prev => {
      const newSet = new Set(prev)
      if (newSet.has(empleadoId)) {
        newSet.delete(empleadoId)
      } else {
        newSet.add(empleadoId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const filteredIds = filteredEmpleados.map(e => e.id)
    if (selectedEmpleados.size === filteredIds.length) {
      setSelectedEmpleados(new Set())
    } else {
      setSelectedEmpleados(new Set(filteredIds))
    }
  }

  const handleAssign = async () => {
    if (!targetSucursal) {
      toast.error("Selecciona una sucursal destino")
      return
    }

    if (selectedEmpleados.size === 0) {
      toast.error("Selecciona al menos un empleado")
      return
    }

    try {
      setAssigning(true)

      const updates = Array.from(selectedEmpleados).map(empleadoId => ({
        id: empleadoId,
        sucursal_id: targetSucursal
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('empleados')
          .update({ sucursal_id: update.sucursal_id })
          .eq('id', update.id)

        if (error) throw error
      }

      toast.success(`${updates.length} empleado(s) asignado(s) correctamente`)
      setSelectedEmpleados(new Set())
      setTargetSucursal("")
      await loadData()

    } catch (error: any) {
      console.error('Error asignando empleados:', error)
      toast.error("Error al asignar empleados: " + error.message)
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveAssignment = async (empleadoId: string) => {
    try {
      const { error } = await supabase
        .from('empleados')
        .update({ sucursal_id: null })
        .eq('id', empleadoId)

      if (error) throw error

      toast.success("Asignación removida correctamente")
      await loadData()

    } catch (error: any) {
      console.error('Error removiendo asignación:', error)
      toast.error("Error al remover asignación: " + error.message)
    }
  }

  const filteredEmpleados = empleados.filter(emp => {
    const matchesSearch = 
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.legajo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSucursal = 
      filterSucursal === "all" ||
      (filterSucursal === "sin_asignar" && !emp.sucursal_id) ||
      emp.sucursal_id === filterSucursal

    return matchesSearch && matchesSucursal
  })

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  // Datos para exportar
  const getExportData = () => {
    return filteredEmpleados.map(emp => ({
      Legajo: emp.legajo || 'N/A',
      Nombre: emp.nombre,
      Apellido: emp.apellido,
      Email: emp.email,
      Puesto: emp.puesto || '-',
      Sucursal: emp.sucursal?.nombre || 'Sin asignar'
    }))
  }

  // Generar PDF por sucursal para Discord
  const generarPDFPorSucursal = () => {
    const doc = new jsPDF()
    const fechaActual = format(new Date(), "dd 'de' MMMM yyyy", { locale: es })
    
    // Título
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Distribución Semanal de Personal", 105, 20, { align: "center" })
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Generado: ${fechaActual}`, 105, 28, { align: "center" })

    let yPosition = 40

    // Agrupar empleados por sucursal
    const empleadosPorSucursal = sucursales.map(suc => ({
      sucursal: suc,
      empleados: empleados.filter(e => e.sucursal_id === suc.id)
    })).filter(g => g.empleados.length > 0)

    // Empleados sin asignar
    const sinAsignar = empleados.filter(e => !e.sucursal_id)

    empleadosPorSucursal.forEach((grupo, idx) => {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      // Header de sucursal
      doc.setFillColor(59, 130, 246)
      doc.rect(14, yPosition - 5, 182, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(`📍 ${grupo.sucursal.nombre}`, 16, yPosition)
      doc.text(`(${grupo.empleados.length} empleados)`, 190, yPosition, { align: "right" })
      
      yPosition += 8

      // Tabla de empleados
      doc.setTextColor(0, 0, 0)
      autoTable(doc, {
        startY: yPosition,
        head: [['Legajo', 'Nombre Completo', 'Puesto']],
        body: grupo.empleados.map(e => [
          e.legajo || 'N/A',
          `${e.apellido}, ${e.nombre}`,
          e.puesto || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto'
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15
    })

    // Sección sin asignar
    if (sinAsignar.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFillColor(239, 68, 68)
      doc.rect(14, yPosition - 5, 182, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(`⚠️ Sin Asignar`, 16, yPosition)
      doc.text(`(${sinAsignar.length} empleados)`, 190, yPosition, { align: "right" })
      
      yPosition += 8

      doc.setTextColor(0, 0, 0)
      autoTable(doc, {
        startY: yPosition,
        head: [['Legajo', 'Nombre Completo', 'Puesto']],
        body: sinAsignar.map(e => [
          e.legajo || 'N/A',
          `${e.apellido}, ${e.nombre}`,
          e.puesto || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      })
    }

    // Resumen final
    doc.addPage()
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Resumen de Distribución", 105, 20, { align: "center" })

    autoTable(doc, {
      startY: 30,
      head: [['Sucursal', 'Cantidad de Empleados']],
      body: [
        ...empleadosPorSucursal.map(g => [g.sucursal.nombre, g.empleados.length.toString()]),
        ...(sinAsignar.length > 0 ? [['Sin Asignar', sinAsignar.length.toString()]] : []),
        ['TOTAL', empleados.length.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' }
    })

    const filename = `distribucion-personal-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    doc.save(filename)
    toast.success("PDF generado correctamente", { description: filename })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{empleados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sucursales Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sucursales.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4" />
              Seleccionados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedEmpleados.size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de asignación */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Asignar Empleados a Sucursal
              </CardTitle>
              <CardDescription>
                Selecciona empleados y asígnalos a una sucursal de forma rápida
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportButton
                data={getExportData()}
                filename={`asignacion-sucursales-${format(new Date(), 'yyyy-MM-dd')}`}
                sheetName="Empleados"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={generarPDFPorSucursal}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF Discord
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros y búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar Empleado</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, apellido, legajo o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Sucursal</Label>
              <Select value={filterSucursal} onValueChange={setFilterSucursal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                  {sucursales.map(suc => (
                    <SelectItem key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Asignación masiva */}
          {selectedEmpleados.size > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {selectedEmpleados.size} empleado(s) seleccionado(s)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Asignar a sucursal:
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Select value={targetSucursal} onValueChange={setTargetSucursal}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar sucursal destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map(suc => (
                      <SelectItem key={suc.id} value={suc.id}>
                        {suc.nombre}
                        {suc.ciudad && ` - ${suc.ciudad}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  onClick={handleAssign}
                  disabled={!targetSucursal || assigning}
                  className="gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  {assigning ? "Asignando..." : "Asignar"}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setSelectedEmpleados(new Set())}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Tabla de empleados */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedEmpleados.size === filteredEmpleados.length && filteredEmpleados.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Sucursal Actual</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpleados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmpleados.map(empleado => (
                    <TableRow key={empleado.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmpleados.has(empleado.id)}
                          onCheckedChange={() => handleToggleEmpleado(empleado.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={empleado.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(empleado.nombre, empleado.apellido)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {empleado.nombre} {empleado.apellido}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {empleado.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{empleado.legajo || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {empleado.puesto || '-'}
                      </TableCell>
                      <TableCell>
                        {empleado.sucursal ? (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {empleado.sucursal.nombre}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sin asignar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {empleado.sucursal_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAssignment(empleado.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando {filteredEmpleados.length} de {empleados.length} empleados
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
