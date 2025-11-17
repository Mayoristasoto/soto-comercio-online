import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";
import { generateReciboSueldoPDF } from "@/utils/reciboSueldoPDF";

export default function GenerarReciboDemo() {
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>("");
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAnio, setSelectedAnio] = useState<string>(new Date().getFullYear().toString());
  const [isGenerating, setIsGenerating] = useState(false);

  // Obtener empleados con configuración de payroll
  const { data: empleados, isLoading: loadingEmpleados } = useQuery({
    queryKey: ['empleados-payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados_payroll_completo')
        .select('*')
        .eq('activo', true)
        .order('apellido');
      
      if (error) throw error;
      return data;
    }
  });

  const handleGenerarRecibo = async () => {
    if (!selectedEmpleado || !selectedMes || !selectedAnio) {
      toast.error("Seleccione empleado, mes y año");
      return;
    }

    setIsGenerating(true);
    try {
      const empleado = empleados?.find(e => e.id === selectedEmpleado);
      if (!empleado) throw new Error("Empleado no encontrado");

      // Calcular horas trabajadas del mes usando la función de la BD
      const mesNum = parseInt(selectedMes);
      const anioNum = parseInt(selectedAnio);
      
      // Formato período: 'YYYY-MM'
      const periodo = `${anioNum}-${mesNum.toString().padStart(2, '0')}`;
      
      const { data: horasData, error: horasError } = await supabase.rpc('calcular_horas_mes', {
        p_empleado_id: selectedEmpleado,
        p_periodo: periodo
      });

      if (horasError) throw horasError;
      
      // La función retorna un array con un objeto
      const horasResult = horasData?.[0];
      const horasTrabajadas = horasResult 
        ? horasResult.horas_normales + horasResult.horas_extras_50 + horasResult.horas_extras_100
        : 0;
      const diasTrabajados = horasResult?.dias_trabajados || 0;

      // Obtener datos del convenio colectivo
      let valorHoraBase = 0;
      let horasMensuales = empleado.horas_mensuales || 160;
      let porcentajeHE50 = 150;
      let porcentajeHE100 = 200;

      if (empleado.convenio_id) {
        const { data: convenio } = await supabase
          .from('convenios_colectivos')
          .select('*')
          .eq('id', empleado.convenio_id)
          .maybeSingle();

        if (convenio) {
          valorHoraBase = convenio.valor_hora_base || 0;
          horasMensuales = convenio.horas_mensuales;
          porcentajeHE50 = convenio.porcentaje_he_50;
          porcentajeHE100 = convenio.porcentaje_he_100;
        }
      }
      
      // Sueldo básico
      const sueldoBasico = empleado.sueldo_basico || (valorHoraBase * horasMensuales);
      
      // Usar las horas del resultado si están disponibles
      const horasExtras50 = horasResult?.horas_extras_50 || 0;
      const valorHE50 = horasExtras50 * valorHoraBase * (porcentajeHE50 / 100);
      
      const horasExtras100 = horasResult?.horas_extras_100 || 0;
      const valorHE100 = horasExtras100 * valorHoraBase * (porcentajeHE100 / 100);
      
      // Antigüedad (1% por año) - solo si tenemos fecha de ingreso
      let aniosAntiguedad = 0;
      let antiguedad = 0;
      
      if (empleado.fecha_ingreso) {
        const { data: antiguedadData } = await supabase.rpc('calcular_antiguedad_anios', {
          fecha_ingreso: empleado.fecha_ingreso
        });
        aniosAntiguedad = antiguedadData || 0;
        antiguedad = sueldoBasico * 0.01 * aniosAntiguedad;
      }

      // Presentismo (ejemplo: 10% del básico)
      const presentismo = sueldoBasico * 0.10;

      // Total remunerativo
      const totalRemunerativo = sueldoBasico + valorHE50 + valorHE100 + antiguedad + presentismo;

      // Deducciones (porcentajes aproximados)
      const jubilacion = totalRemunerativo * 0.11; // 11%
      const ley19032 = totalRemunerativo * 0.03; // 3%
      const obraSocial = totalRemunerativo * (empleado.porcentaje_obra_social || 3) / 100;
      const sindicato = totalRemunerativo * (empleado.porcentaje_sindicato || 2.5) / 100;

      const totalDeducciones = jubilacion + ley19032 + obraSocial + sindicato;
      const netoAPagar = totalRemunerativo - totalDeducciones;

      // Generar datos del recibo
      const reciboData = {
        empleado: {
          legajo: empleado.legajo || 'N/A',
          nombre: `${empleado.nombre} ${empleado.apellido}`,
          dni: empleado.dni || 'N/A',
          cuil: empleado.dni ? `20-${empleado.dni}-0` : 'N/A',
          puesto: empleado.puesto || 'N/A',
          fecha_ingreso: empleado.fecha_ingreso,
          convenio: empleado.convenio_nombre || 'N/A',
          categoria: empleado.categoria || 'N/A',
        },
        periodo: {
          mes: mesNum,
          anio: anioNum,
          fecha_pago: new Date(anioNum, mesNum, 5).toISOString().split('T')[0]
        },
        conceptos_remunerativos: [
          { codigo: '001', descripcion: 'Sueldo Básico', cantidad: horasMensuales, valor_unitario: valorHoraBase, importe: sueldoBasico },
          ...(horasExtras50 > 0 ? [{ codigo: '010', descripcion: 'Horas Extras 50%', cantidad: horasExtras50, valor_unitario: valorHoraBase * 1.5, importe: valorHE50 }] : []),
          ...(horasExtras100 > 0 ? [{ codigo: '011', descripcion: 'Horas Extras 100%', cantidad: horasExtras100, valor_unitario: valorHoraBase * 2, importe: valorHE100 }] : []),
          { codigo: '020', descripcion: 'Antigüedad', cantidad: aniosAntiguedad, valor_unitario: sueldoBasico * 0.01, importe: antiguedad },
          { codigo: '030', descripcion: 'Presentismo', cantidad: 1, valor_unitario: presentismo, importe: presentismo },
        ],
        conceptos_no_remunerativos: [],
        deducciones: [
          { codigo: '101', descripcion: 'Jubilación', importe: jubilacion },
          { codigo: '102', descripcion: 'Ley 19032', importe: ley19032 },
          { codigo: '103', descripcion: 'Obra Social', importe: obraSocial },
          { codigo: '104', descripcion: 'Sindicato', importe: sindicato },
        ],
        totales: {
          total_remunerativo: totalRemunerativo,
          total_no_remunerativo: 0,
          total_deducciones: totalDeducciones,
          neto_a_pagar: netoAPagar,
        },
        estadisticas: {
          horas_trabajadas: horasTrabajadas,
          dias_trabajados: diasTrabajados,
        }
      };

      // Generar PDF
      await generateReciboSueldoPDF(reciboData);
      
      toast.success("Recibo generado exitosamente");
    } catch (error: any) {
      console.error("Error generando recibo:", error);
      toast.error(error.message || "Error al generar recibo");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generación de Recibo (Demo)
          </CardTitle>
          <CardDescription>
            Genera un recibo de sueldo usando datos reales de fichajes del mes seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.apellido}, {emp.nombre} - {emp.legajo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          <Button 
            onClick={handleGenerarRecibo} 
            disabled={isGenerating || loadingEmpleados || !selectedEmpleado || !selectedMes}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generando..." : "Generar Recibo PDF"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Este componente calcula automáticamente horas trabajadas desde los fichajes del mes</p>
          <p>• Aplica el convenio colectivo y configuración del empleado</p>
          <p>• Calcula horas extras al 50% y 100%</p>
          <p>• Incluye antigüedad, presentismo y deducciones legales</p>
          <p>• Genera un PDF descargable con formato profesional</p>
        </CardContent>
      </Card>
    </div>
  );
}
