import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, User, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  email: string
  legajo: string | null
  avatar_url: string | null
  activo: boolean
}

interface ConfiguracionPayroll {
  empleado_id: string
  convenio_id: string | null
  categoria: string | null
  obra_social_id: string | null
  porcentaje_obra_social: number
  sindicato_id: string | null
  porcentaje_sindicato: number | null
  banco: string | null
  cbu: string | null
  tipo_cuenta: string | null
  forma_pago: 'transferencia' | 'efectivo' | 'cheque'
  exento_ganancias: boolean
  cargas_familia: number
}

interface ConvenioColectivo {
  id: string
  codigo: string
  nombre: string
}

export default function ConfiguracionPayroll() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [convenios, setConvenios] = useState<ConvenioColectivo[]>([])
  const [configuraciones, setConfiguraciones] = useState<Map<string, ConfiguracionPayroll>>(new Map())
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [formData, setFormData] = useState<Partial<ConfiguracionPayroll>>({
    convenio_id: '',
    categoria: '',
    porcentaje_obra_social: 3.00,
    porcentaje_sindicato: null,
    banco: '',
    cbu: '',
    tipo_cuenta: '',
    forma_pago: 'transferencia',
    exento_ganancias: false,
    cargas_familia: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [empleadosResult, conveniosResult, configuracionesResult] = await Promise.all([
        supabase.from('empleados').select('id, nombre, apellido, email, legajo, avatar_url, activo')
          .eq('activo', true).order('apellido'),
        supabase.from('convenios_colectivos').select('id, codigo, nombre').eq('activo', true),
        supabase.from('empleados_configuracion_payroll').select('*')
      ])

      if (empleadosResult.error) throw empleadosResult.error
      if (conveniosResult.error) throw conveniosResult.error
      if (configuracionesResult.error) throw configuracionesResult.error

      setEmpleados(empleadosResult.data || [])
      setConvenios(conveniosResult.data || [])
      
      const configMap = new Map<string, ConfiguracionPayroll>()
      configuracionesResult.data?.forEach(config => {
        configMap.set(config.empleado_id, config)
      })
      setConfiguraciones(configMap)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfigureEmpleado = (empleado: Empleado) => {
    setSelectedEmpleado(empleado)
    const config = configuraciones.get(empleado.id)
    
    if (config) {
      setFormData({
        convenio_id: config.convenio_id || '',
        categoria: config.categoria || '',
        porcentaje_obra_social: config.porcentaje_obra_social,
        porcentaje_sindicato: config.porcentaje_sindicato,
        banco: config.banco || '',
        cbu: config.cbu || '',
        tipo_cuenta: config.tipo_cuenta || '',
        forma_pago: config.forma_pago,
        exento_ganancias: config.exento_ganancias,
        cargas_familia: config.cargas_familia
      })
    } else {
      setFormData({
        convenio_id: '',
        categoria: '',
        porcentaje_obra_social: 3.00,
        porcentaje_sindicato: null,
        banco: '',
        cbu: '',
        tipo_cuenta: '',
        forma_pago: 'transferencia',
        exento_ganancias: false,
        cargas_familia: 0
      })
    }
    
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmpleado) return
    
    try {
      const configData = {
        empleado_id: selectedEmpleado.id,
        convenio_id: formData.convenio_id || null,
        categoria: formData.categoria || null,
        porcentaje_obra_social: formData.porcentaje_obra_social || 3.00,
        porcentaje_sindicato: formData.porcentaje_sindicato || null,
        banco: formData.banco || null,
        cbu: formData.cbu || null,
        tipo_cuenta: formData.tipo_cuenta || null,
        forma_pago: formData.forma_pago || 'transferencia',
        exento_ganancias: formData.exento_ganancias || false,
        cargas_familia: formData.cargas_familia || 0
      }

      const { error } = await supabase
        .from('empleados_configuracion_payroll')
        .upsert([configData], { onConflict: 'empleado_id' })

      if (error) throw error
      
      toast({
        title: "Configuración guardada",
        description: `Configuración de payroll actualizada para ${selectedEmpleado.nombre} ${selectedEmpleado.apellido}`
      })

      setDialogOpen(false)
      loadData()
    } catch (error: any) {
      console.error('Error guardando configuración:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive"
      })
    }
  }

  const getEstadoConfiguracion = (empleadoId: string) => {
    const config = configuraciones.get(empleadoId)
    if (!config) {
      return { 
        badge: <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Sin Configurar</Badge>,
        completo: false 
      }
    }
    
    const esCompleto = config.convenio_id && config.categoria && config.banco && config.cbu
    
    if (esCompleto) {
      return { 
        badge: <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Configurado</Badge>,
        completo: true 
      }
    }
    
    return { 
      badge: <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Incompleto</Badge>,
      completo: false 
    }
  }

  const getConvenioNombre = (empleadoId: string) => {
    const config = configuraciones.get(empleadoId)
    if (!config?.convenio_id) return '-'
    
    const convenio = convenios.find(c => c.id === config.convenio_id)
    return convenio ? `${convenio.codigo}` : '-'
  }

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de Payroll por Empleado
        </CardTitle>
        <CardDescription>
          Asigne convenios, categorías y datos bancarios para liquidación de sueldos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {empleados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay empleados activos
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Convenio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map((empleado) => {
                  const config = configuraciones.get(empleado.id)
                  const estado = getEstadoConfiguracion(empleado.id)
                  
                  return (
                    <TableRow key={empleado.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={empleado.avatar_url || undefined} />
                            <AvatarFallback>
                              {empleado.nombre[0]}{empleado.apellido[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{empleado.nombre} {empleado.apellido}</div>
                            <div className="text-xs text-muted-foreground">{empleado.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{empleado.legajo || '-'}</TableCell>
                      <TableCell>{getConvenioNombre(empleado.id)}</TableCell>
                      <TableCell>{config?.categoria || '-'}</TableCell>
                      <TableCell>{estado.badge}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigureEmpleado(empleado)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Configurar Payroll - {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
              </DialogTitle>
              <DialogDescription>
                Configure los parámetros de liquidación para este empleado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Convenio y Categoría</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="convenio_id">Convenio Colectivo *</Label>
                    <Select value={formData.convenio_id} onValueChange={(value) => setFormData({ ...formData, convenio_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un convenio" />
                      </SelectTrigger>
                      <SelectContent>
                        {convenios.map((convenio) => (
                          <SelectItem key={convenio.id} value={convenio.id}>
                            {convenio.codigo} - {convenio.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría *</Label>
                    <Input
                      id="categoria"
                      placeholder="Ej: Empleado A"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Aportes y Contribuciones</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="porcentaje_obra_social">Obra Social (%)</Label>
                    <Input
                      id="porcentaje_obra_social"
                      type="number"
                      step="0.01"
                      value={formData.porcentaje_obra_social}
                      onChange={(e) => setFormData({ ...formData, porcentaje_obra_social: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="porcentaje_sindicato">Sindicato (%) - Opcional</Label>
                    <Input
                      id="porcentaje_sindicato"
                      type="number"
                      step="0.01"
                      placeholder="Ej: 2.5"
                      value={formData.porcentaje_sindicato || ''}
                      onChange={(e) => setFormData({ ...formData, porcentaje_sindicato: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Datos Bancarios</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="banco">Banco *</Label>
                    <Input
                      id="banco"
                      placeholder="Ej: Banco Nación"
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo_cuenta">Tipo de Cuenta</Label>
                    <Select value={formData.tipo_cuenta} onValueChange={(value) => setFormData({ ...formData, tipo_cuenta: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caja_ahorro">Caja de Ahorro</SelectItem>
                        <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cbu">CBU *</Label>
                  <Input
                    id="cbu"
                    placeholder="22 dígitos"
                    maxLength={22}
                    value={formData.cbu}
                    onChange={(e) => setFormData({ ...formData, cbu: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forma_pago">Forma de Pago</Label>
                  <Select value={formData.forma_pago} onValueChange={(value: any) => setFormData({ ...formData, forma_pago: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Otros Datos</h3>
                <div className="space-y-2">
                  <Label htmlFor="cargas_familia">Cargas de Familia</Label>
                  <Input
                    id="cargas_familia"
                    type="number"
                    value={formData.cargas_familia}
                    onChange={(e) => setFormData({ ...formData, cargas_familia: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="exento_ganancias"
                    checked={formData.exento_ganancias}
                    onCheckedChange={(checked) => setFormData({ ...formData, exento_ganancias: checked })}
                  />
                  <Label htmlFor="exento_ganancias">Exento de Ganancias</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar Configuración
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
