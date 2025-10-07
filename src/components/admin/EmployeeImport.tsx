import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Upload, X, Save, FileSpreadsheet } from "lucide-react"
import * as XLSX from 'xlsx'

interface ImportedEmployee {
  nombre: string
  apellido: string
  email: string
  dni?: string
  telefono?: string
  direccion?: string
  fecha_nacimiento?: string
  puesto?: string
  rol: string
  fecha_ingreso: string
  activo: boolean
  salario?: number
  estado_civil?: string
  emergencia_contacto_nombre?: string
  emergencia_contacto_telefono?: string
}

interface EmployeeImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

export default function EmployeeImport({ open, onOpenChange, onImportComplete }: EmployeeImportProps) {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<ImportedEmployee[]>([])
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[]

        const importedData: ImportedEmployee[] = jsonData.map((row) => ({
          nombre: row['Nombre'] || row['nombre'] || '',
          apellido: row['Apellido'] || row['apellido'] || '',
          email: row['Email'] || row['email'] || row['Correo'] || '',
          dni: row['DNI'] || row['dni'] || '',
          telefono: row['Teléfono'] || row['telefono'] || row['Telefono'] || '',
          direccion: row['Dirección'] || row['direccion'] || row['Direccion'] || '',
          fecha_nacimiento: row['Fecha Nacimiento'] || row['fecha_nacimiento'] || '',
          puesto: row['Puesto'] || row['puesto'] || '',
          rol: row['Rol'] || row['rol'] || 'empleado',
          fecha_ingreso: row['Fecha Ingreso'] || row['fecha_ingreso'] || new Date().toISOString().split('T')[0],
          activo: row['Activo'] === undefined ? true : row['Activo'] === 'Sí' || row['Activo'] === 'Si' || row['Activo'] === true,
          salario: row['Salario'] || row['salario'] || undefined,
          estado_civil: row['Estado Civil'] || row['estado_civil'] || '',
          emergencia_contacto_nombre: row['Contacto Emergencia'] || row['emergencia_contacto_nombre'] || '',
          emergencia_contacto_telefono: row['Tel. Emergencia'] || row['emergencia_contacto_telefono'] || ''
        }))

        setEmployees(importedData)
        toast({
          title: "Archivo cargado",
          description: `Se encontraron ${importedData.length} empleados en el archivo`
        })
      } catch (error) {
        console.error('Error al procesar el archivo:', error)
        toast({
          title: "Error",
          description: "No se pudo procesar el archivo Excel",
          variant: "destructive"
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  const updateEmployee = (index: number, field: keyof ImportedEmployee, value: any) => {
    const updated = [...employees]
    updated[index] = { ...updated[index], [field]: value }
    setEmployees(updated)
  }

  const removeEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index))
  }

  const validateEmployees = () => {
    const errors: string[] = []
    
    employees.forEach((emp, index) => {
      if (!emp.nombre?.trim()) errors.push(`Fila ${index + 1}: Nombre es requerido`)
      if (!emp.apellido?.trim()) errors.push(`Fila ${index + 1}: Apellido es requerido`)
      if (!emp.email?.trim()) errors.push(`Fila ${index + 1}: Email es requerido`)
      if (emp.email && !emp.email.includes('@')) errors.push(`Fila ${index + 1}: Email inválido`)
      if (!emp.rol) errors.push(`Fila ${index + 1}: Rol es requerido`)
    })

    return errors
  }

  const handleImport = async () => {
    const errors = validateEmployees()
    if (errors.length > 0) {
      toast({
        title: "Errores de validación",
        description: errors.join(', '),
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const emp of employees) {
        try {
          // Insertar empleado
          const { data: empleadoData, error: empleadoError } = await supabase
            .from('empleados')
            .insert({
              nombre: String(emp.nombre || '').trim(),
              apellido: String(emp.apellido || '').trim(),
              email: String(emp.email || '').trim().toLowerCase(),
              dni: emp.dni ? String(emp.dni).trim() : null,
              rol: emp.rol as any,
              fecha_ingreso: emp.fecha_ingreso,
              activo: emp.activo,
              puesto: emp.puesto ? String(emp.puesto).trim() : null
            })
            .select()
            .single()

          if (empleadoError) throw empleadoError

          // Insertar datos sensibles si existen
          if (empleadoData && (emp.telefono || emp.direccion || emp.salario || emp.fecha_nacimiento)) {
            const { error: sensibleError } = await (supabase.rpc as any)(
              'admin_update_sensitive_data',
              {
                p_empleado_id: empleadoData.id,
                p_telefono: emp.telefono ? String(emp.telefono).trim() : null,
                p_direccion: emp.direccion ? String(emp.direccion).trim() : null,
                p_salario: emp.salario ? Number(emp.salario) : null,
                p_fecha_nacimiento: emp.fecha_nacimiento || null,
                p_estado_civil: emp.estado_civil ? String(emp.estado_civil).trim() : null,
                p_emergencia_contacto_nombre: emp.emergencia_contacto_nombre ? String(emp.emergencia_contacto_nombre).trim() : null,
                p_emergencia_contacto_telefono: emp.emergencia_contacto_telefono ? String(emp.emergencia_contacto_telefono).trim() : null,
              }
            )


            if (sensibleError) console.error('Error insertando datos sensibles:', sensibleError)
          }

          successCount++
        } catch (error: any) {
          console.error('Error importando empleado:', error)
          errorCount++
        }
      }

      toast({
        title: "Importación completada",
        description: `${successCount} empleados importados exitosamente${errorCount > 0 ? `, ${errorCount} con errores` : ''}`
      })

      if (successCount > 0) {
        setEmployees([])
        onImportComplete()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error en la importación:', error)
      toast({
        title: "Error",
        description: "Error al importar empleados",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        'Nombre': 'Juan',
        'Apellido': 'Pérez',
        'Email': 'juan.perez@example.com',
        'DNI': '12345678',
        'Teléfono': '+54 11 1234-5678',
        'Dirección': 'Calle Falsa 123',
        'Fecha Nacimiento': '1990-01-15',
        'Puesto': 'Vendedor',
        'Rol': 'empleado',
        'Fecha Ingreso': '2024-01-01',
        'Activo': 'Sí',
        'Salario': '150000',
        'Estado Civil': 'Soltero',
        'Contacto Emergencia': 'María Pérez',
        'Tel. Emergencia': '+54 11 9876-5432'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados')
    XLSX.writeFile(wb, 'plantilla_empleados.xlsx')

    toast({
      title: "Plantilla descargada",
      description: "Completa la plantilla con los datos de los empleados"
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Empleados desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Upload className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
            <div className="flex-1">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
          </div>

          {employees.length > 0 && (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Nombre</TableHead>
                      <TableHead className="w-[100px]">Apellido</TableHead>
                      <TableHead className="w-[180px]">Email</TableHead>
                      <TableHead className="w-[100px]">DNI</TableHead>
                      <TableHead className="w-[100px]">Puesto</TableHead>
                      <TableHead className="w-[120px]">Rol</TableHead>
                      <TableHead className="w-[120px]">Fecha Ingreso</TableHead>
                      <TableHead className="w-[80px]">Activo</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={emp.nombre}
                            onChange={(e) => updateEmployee(index, 'nombre', e.target.value)}
                            className="min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={emp.apellido}
                            onChange={(e) => updateEmployee(index, 'apellido', e.target.value)}
                            className="min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={emp.email}
                            onChange={(e) => updateEmployee(index, 'email', e.target.value)}
                            className="min-w-[180px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={emp.dni || ''}
                            onChange={(e) => updateEmployee(index, 'dni', e.target.value)}
                            className="min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={emp.puesto || ''}
                            onChange={(e) => updateEmployee(index, 'puesto', e.target.value)}
                            className="min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={emp.rol}
                            onValueChange={(value) => updateEmployee(index, 'rol', value)}
                          >
                            <SelectTrigger className="min-w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empleado">Empleado</SelectItem>
                              <SelectItem value="gerente_sucursal">Gerente</SelectItem>
                              <SelectItem value="admin_rrhh">Admin RRHH</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={emp.fecha_ingreso}
                            onChange={(e) => updateEmployee(index, 'fecha_ingreso', e.target.value)}
                            className="min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={emp.activo ? 'true' : 'false'}
                            onValueChange={(value) => updateEmployee(index, 'activo', value === 'true')}
                          >
                            <SelectTrigger className="min-w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Sí</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEmployee(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {employees.length} empleado(s) listos para importar
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEmployees([])}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImport} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Importando...' : 'Importar Empleados'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
