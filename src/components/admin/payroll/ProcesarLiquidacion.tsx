import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator, FileText, Download, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { generateReciboSueldoPDF } from "@/utils/reciboSueldoPDF";

export default function ProcesarLiquidacion() {
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAnio, setSelectedAnio] = useState<string>(new Date().getFullYear().toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const queryClient = useQueryClient();

  const periodo = selectedMes && selectedAnio ? `${selectedAnio}-${selectedMes.padStart(2, '0')}` : null;

  // Obtener empleados activos con configuración de payroll
  const { data: empleados, isLoading: loadingEmpleados } = useQuery({
    queryKey: ['empleados-payroll-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados_payroll_completo')
        .select('*')
        .eq('activo', true)
        .not('sueldo_basico', 'is', null)
        .order('apellido');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Verificar si ya existe liquidación para el período
  const { data: liquidacionExistente } = useQuery({
    queryKey: ['liquidacion', selectedMes, selectedAnio],
    queryFn: async () => {
      if (!selectedMes || !selectedAnio) return null;
      
      const { data, error } = await (supabase as any)
        .from('liquidaciones_mensuales')
        .select('*')
        .eq('mes', parseInt(selectedMes))
        .eq('anio', parseInt(selectedAnio))
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedMes && !!selectedAnio
  });

  // Obtener recibos de la liquidación existente
  const { data: recibos } = useQuery({
    queryKey: ['recibos', liquidacionExistente?.id],
    queryFn: async () => {
      if (!liquidacionExistente?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('recibos_sueldo')
        .select('*, empleados:empleado_id(nombre, apellido)')
        .eq('liquidacion_id', (liquidacionExistente as any).id)
        .order('empleado_id');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!(liquidacionExistente as any)?.id
  });

  const procesarLiquidacion = useMutation({
    mutationFn: async () => {
      if (!periodo || !empleados || empleados.length === 0) {
        throw new Error("Faltan datos para procesar");
      }

      setIsProcessing(true);
      setProcessProgress(0);

      // 1. Crear o actualizar liquidación
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: empleadoActual } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', currentUser.user?.id)
        .single();

      const { data: liquidacion, error: liquidacionError } = await supabase
        .from('liquidaciones_mensuales')
        .insert([{
          mes: parseInt(selectedMes),
          anio: parseInt(selectedAnio),
          estado: 'procesada',
          procesado_por: empleadoActual?.id
        }] as any)
        .select()
        .single();

      if (liquidacionError) {
        // Si ya existe, obtenerla
        const { data: existingLiq } = await (supabase as any)
          .from('liquidaciones_mensuales')
          .select('*')
          .eq('mes', parseInt(selectedMes))
          .eq('anio', parseInt(selectedAnio))
          .single();
        
        if (!existingLiq) throw liquidacionError;
        return existingLiq;
      }

      // 2. Procesar cada empleado
      const totalEmpleados = empleados.length;
      const recibosData = [];

      for (let i = 0; i < empleados.length; i++) {
        const empleado = empleados[i];
        
        try {
          // Calcular conceptos básicos
          const sueldoBasico = empleado.sueldo_basico || 0;
          const antiguedad = empleado.fecha_ingreso 
            ? Math.floor((new Date().getFullYear() - new Date(empleado.fecha_ingreso).getFullYear())) * sueldoBasico * 0.01
            : 0;
          const presentismo = sueldoBasico * 0.10;
          
          const totalRemunerativo = sueldoBasico + antiguedad + presentismo;
          
          // Deducciones
          const jubilacion = totalRemunerativo * 0.11;
          const ley19032 = totalRemunerativo * 0.03;
          const obraSocial = totalRemunerativo * (empleado.porcentaje_obra_social || 3) / 100;
          const sindicato = totalRemunerativo * (empleado.porcentaje_sindicato || 2.5) / 100;
          
          const totalDeducciones = jubilacion + ley19032 + obraSocial + sindicato;
          const netoAPagar = totalRemunerativo - totalDeducciones;

          // Preparar conceptos
          const conceptosRemunerativos = [
            { codigo: '001', descripcion: 'Sueldo Básico', cantidad: empleado.horas_mensuales || 160, valor_unitario: sueldoBasico / (empleado.horas_mensuales || 160), importe: sueldoBasico },
            ...(antiguedad > 0 ? [{ codigo: '020', descripcion: 'Antigüedad', cantidad: Math.floor((new Date().getFullYear() - new Date(empleado.fecha_ingreso).getFullYear())), valor_unitario: sueldoBasico * 0.01, importe: antiguedad }] : []),
            { codigo: '030', descripcion: 'Presentismo', cantidad: 1, valor_unitario: presentismo, importe: presentismo }
          ];

          const deducciones = [
            { codigo: '101', descripcion: 'Jubilación', importe: jubilacion },
            { codigo: '102', descripcion: 'Ley 19032', importe: ley19032 },
            { codigo: '103', descripcion: 'Obra Social', importe: obraSocial },
            { codigo: '104', descripcion: 'Sindicato', importe: sindicato }
          ];

          recibosData.push({
            liquidacion_id: liquidacion.id,
            empleado_id: empleado.id,
            periodo: periodo,
            conceptos_remunerativos: conceptosRemunerativos,
            deducciones: deducciones,
            total_remunerativo: totalRemunerativo,
            total_deducciones: totalDeducciones,
            neto_a_pagar: netoAPagar
          });

        } catch (err) {
          console.error(`Error procesando empleado ${empleado.id}:`, err);
        }

        setProcessProgress(((i + 1) / totalEmpleados) * 100);
      }

      // 3. Insertar recibos en lote
      const { error: recibosError } = await supabase
        .from('recibos_sueldo')
        .insert(recibosData as any);

      if (recibosError) throw recibosError;

      return liquidacion;
    },
    onSuccess: () => {
      toast.success("Liquidación procesada exitosamente");
      queryClient.invalidateQueries({ queryKey: ['liquidacion'] });
      queryClient.invalidateQueries({ queryKey: ['recibos'] });
      setIsProcessing(false);
      setProcessProgress(0);
    },
    onError: (error: any) => {
      console.error("Error procesando liquidación:", error);
      toast.error(error.message || "Error al procesar liquidación");
      setIsProcessing(false);
      setProcessProgress(0);
    }
  });

  const generarPDFsMasivos = async () => {
    if (!recibos || recibos.length === 0) {
      toast.error("No hay recibos para generar");
      return;
    }

    setIsProcessing(true);
    let generados = 0;

    try {
      for (const recibo of recibos) {
        const empleado = (recibo as any).empleados;
        if (!empleado) continue;

        const reciboData = {
          empleado: {
            legajo: empleado.legajo || 'N/A',
            nombre: `${empleado.nombre} ${empleado.apellido}`,
            dni: empleado.dni || 'N/A',
            cuil: empleado.dni ? `20-${empleado.dni}-0` : 'N/A',
            puesto: empleado.puesto || 'N/A',
            fecha_ingreso: empleado.fecha_ingreso,
            convenio: empleado.convenio_nombre || 'N/A',
            categoria: empleado.categoria || 'N/A'
          },
          periodo: {
            mes: parseInt(selectedMes),
            anio: parseInt(selectedAnio),
            fecha_pago: `${selectedAnio}-${selectedMes.padStart(2, '0')}-05`
          },
          conceptos_remunerativos: (recibo as any).conceptos_remunerativos || [],
          conceptos_no_remunerativos: [],
          deducciones: (recibo as any).deducciones || [],
          totales: {
            total_remunerativo: (recibo as any).total_remunerativo || 0,
            total_no_remunerativo: 0,
            total_deducciones: (recibo as any).total_deducciones || 0,
            neto_a_pagar: (recibo as any).neto_a_pagar || 0
          },
          estadisticas: {
            horas_trabajadas: (recibo as any).horas_trabajadas || 0,
            dias_trabajados: (recibo as any).dias_trabajados || 0
          }
        };

        await generateReciboSueldoPDF(reciboData);
        generados++;
        setProcessProgress((generados / recibos.length) * 100);
      }

      toast.success(`${generados} recibos generados exitosamente`);
    } catch (error: any) {
      console.error("Error generando PDFs:", error);
      toast.error("Error al generar algunos recibos");
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Procesar Liquidación Mensual
          </CardTitle>
          <CardDescription>
            Calcula y genera recibos de sueldo para todos los empleados activos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <SelectItem key={mes} value={mes.toString()}>
                      {new Date(2000, mes - 1).toLocaleString('es-ES', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedAnio} onValueChange={setSelectedAnio}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumen */}
          {empleados && selectedMes && selectedAnio && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Empleados</div>
                    <div className="text-2xl font-bold">{empleados.length}</div>
                  </div>
                  {liquidacionExistente && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Bruto</div>
                        <div className="text-2xl font-bold">
                          ${(liquidacionExistente as any).total_bruto?.toLocaleString('es-AR') || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Deducciones</div>
                        <div className="text-2xl font-bold text-red-600">
                          ${(liquidacionExistente as any).total_deducciones?.toLocaleString('es-AR') || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Neto</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${(liquidacionExistente as any).total_neto?.toLocaleString('es-AR') || 0}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {liquidacionExistente && (
                  <div className="mt-4">
                    <Badge variant={
                      (liquidacionExistente as any).estado === 'aprobada' ? 'default' :
                      (liquidacionExistente as any).estado === 'pagada' ? 'secondary' :
                      'outline'
                    }>
                      {(liquidacionExistente as any).estado === 'borrador' && <Clock className="mr-1 h-3 w-3" />}
                      {(liquidacionExistente as any).estado === 'aprobada' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      Estado: {((liquidacionExistente as any).estado || 'borrador').toUpperCase()}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progreso */}
          {isProcessing && (
            <div className="space-y-2">
              <Label>Procesando... {Math.round(processProgress)}%</Label>
              <Progress value={processProgress} />
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => procesarLiquidacion.mutate()}
              disabled={isProcessing || loadingEmpleados || !selectedMes || !selectedAnio || !empleados || empleados.length === 0}
              className="flex-1"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {liquidacionExistente ? 'Recalcular Liquidación' : 'Calcular Liquidación'}
            </Button>

            {liquidacionExistente && recibos && recibos.length > 0 && (
              <Button 
                onClick={generarPDFsMasivos}
                disabled={isProcessing}
                variant="secondary"
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generar {recibos.length} PDFs
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de recibos generados */}
      {recibos && recibos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recibos Generados ({recibos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recibos.slice(0, 10).map((recibo: any) => {
                const emp = recibo.empleados as any;
                return (
                  <div key={recibo.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{emp?.nombre} {emp?.apellido}</div>
                      <div className="text-sm text-muted-foreground">
                        Neto: ${recibo.neto_a_pagar?.toLocaleString('es-AR') || 0}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      Procesado
                    </Badge>
                  </div>
                );
              })}
              {recibos.length > 10 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  ... y {recibos.length - 10} más
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
