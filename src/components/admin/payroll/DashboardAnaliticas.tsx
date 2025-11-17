import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function DashboardAnaliticas() {
  const currentYear = new Date().getFullYear();

  // Datos de liquidaciones del año actual
  const { data: liquidaciones } = useQuery({
    queryKey: ["liquidaciones-analiticas", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones_mensuales")
        .select("*, recibos_sueldo(*)")
        .gte("periodo", `${currentYear}-01`)
        .lte("periodo", `${currentYear}-12`)
        .order("periodo", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Datos de empleados activos con configuración payroll
  const { data: empleadosPayroll } = useQuery({
    queryKey: ["empleados-payroll-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados_payroll_completo")
        .select("*")
        .eq("activo", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Calcular estadísticas generales
  const statsGenerales = liquidaciones?.reduce((acc, liq: any) => ({
    totalBruto: acc.totalBruto + (liq.total_remunerativo || 0),
    totalDeducciones: acc.totalDeducciones + (liq.total_deducciones || 0),
    totalNeto: acc.totalNeto + (liq.total_neto || 0),
    cantidadEmpleados: Math.max(acc.cantidadEmpleados, liq.cantidad_empleados || 0),
  }), { totalBruto: 0, totalDeducciones: 0, totalNeto: 0, cantidadEmpleados: 0 });

  // Datos para gráfico de evolución mensual
  const datosEvolucion = liquidaciones?.map((liq: any) => ({
    mes: format(new Date(liq.periodo + "-01"), "MMM", { locale: es }),
    bruto: liq.total_remunerativo || 0,
    deducciones: liq.total_deducciones || 0,
    neto: liq.total_neto || 0,
  })) || [];

  // Distribución por convenio
  const distribucionConvenio = empleadosPayroll?.reduce((acc: any, emp: any) => {
    const convenio = emp.convenio_nombre || "Sin convenio";
    if (!acc[convenio]) acc[convenio] = 0;
    acc[convenio]++;
    return acc;
  }, {});

  const datosConvenio = Object.entries(distribucionConvenio || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Promedio de variación mensual
  const variacionMensual = datosEvolucion.length > 1 
    ? ((datosEvolucion[datosEvolucion.length - 1]?.neto || 0) - (datosEvolucion[datosEvolucion.length - 2]?.neto || 0)) / (datosEvolucion[datosEvolucion.length - 2]?.neto || 1) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard de Analíticas - Payroll</h2>
        <p className="text-muted-foreground">Métricas y análisis de costos laborales del año {currentYear}</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Neto Pagado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(statsGenerales?.totalNeto || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {variacionMensual > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {Math.abs(variacionMensual).toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bruto</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(statsGenerales?.totalBruto || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Antes de deducciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deducciones</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(statsGenerales?.totalDeducciones || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsGenerales?.totalBruto ? ((statsGenerales.totalDeducciones / statsGenerales.totalBruto) * 100).toFixed(1) : 0}% del bruto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsGenerales?.cantidadEmpleados || 0}</div>
            <p className="text-xs text-muted-foreground">Con configuración activa</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="evolucion" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evolucion">Evolución Mensual</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
          <TabsTrigger value="distribucion">Distribución</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Costos Laborales {currentYear}</CardTitle>
              <CardDescription>Comparativa mensual de conceptos remunerativos, deducciones y neto</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={datosEvolucion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => `$${value.toLocaleString("es-AR")}`}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="bruto" stroke="hsl(var(--primary))" name="Bruto" strokeWidth={2} />
                  <Line type="monotone" dataKey="deducciones" stroke="hsl(var(--destructive))" name="Deducciones" strokeWidth={2} />
                  <Line type="monotone" dataKey="neto" stroke="hsl(var(--chart-2))" name="Neto" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparativa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa Bruto vs Neto</CardTitle>
              <CardDescription>Análisis de la relación entre salarios brutos y netos por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={datosEvolucion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => `$${value.toLocaleString("es-AR")}`}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="bruto" fill="hsl(var(--primary))" name="Bruto" />
                  <Bar dataKey="neto" fill="hsl(var(--chart-2))" name="Neto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribucion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Empleados por Convenio</CardTitle>
              <CardDescription>Cantidad de empleados según convenio colectivo aplicado</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={datosConvenio}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {datosConvenio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
