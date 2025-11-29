import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Mock data
const attendanceData = [
  { day: "Lun", present: 65, late: 3 },
  { day: "Mar", present: 58, late: 5 },
  { day: "Mié", present: 78, late: 2 },
  { day: "Jue", present: 81, late: 1 },
  { day: "Vie", present: 55, late: 8 },
  { day: "Sáb", present: 53, late: 4 },
  { day: "Dom", present: 42, late: 6 },
  { day: "Lun", present: 68, late: 4 },
  { day: "Mar", present: 72, late: 3 },
  { day: "Mié", present: 79, late: 2 },
  { day: "Jue", present: 85, late: 1 },
  { day: "Vie", present: 88, late: 2 },
  { day: "Sáb", present: 84, late: 3 },
];

const costByDept = [
  { name: "Ventas", value: 35000, color: "hsl(var(--chart-1))" },
  { name: "Operaciones", value: 28000, color: "hsl(var(--chart-2))" },
  { name: "Soporte", value: 21245, color: "hsl(var(--chart-3))" },
];

const liveCheckIns = [
  {
    id: 1,
    name: "Sarah Connor",
    position: "Ingeniera de Software",
    department: "Ingeniería",
    timeIn: "08:58 AM",
    status: "on-time",
    payrollId: "#EMP-9281",
    avatar: "SC"
  },
  {
    id: 2,
    name: "James Cameron",
    position: "Jefe de Logística",
    department: "Logística",
    timeIn: "09:12 AM",
    status: "late",
    lateMinutes: 12,
    payrollId: "#EMP-4421",
    avatar: "JC"
  },
  {
    id: 3,
    name: "Lisa Wong",
    position: "Especialista RRHH",
    department: "Recursos Humanos",
    timeIn: "08:45 AM",
    status: "on-time",
    payrollId: "#EMP-1192",
    avatar: "LW"
  },
  {
    id: 4,
    name: "Carlos Méndez",
    position: "Gerente de Ventas",
    department: "Ventas",
    timeIn: "08:30 AM",
    status: "on-time",
    payrollId: "#EMP-3345",
    avatar: "CM"
  },
  {
    id: 5,
    name: "Ana Rodríguez",
    position: "Desarrolladora Frontend",
    department: "Ingeniería",
    timeIn: "09:05 AM",
    status: "late",
    lateMinutes: 5,
    payrollId: "#EMP-5567",
    avatar: "AR"
  },
];

export const OnboardingDashboardDemo = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Nómina y Asistencia</h1>
          <p className="text-muted-foreground">
            Resumen para el {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <Card className="border-l-4 border-l-blue-500 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Empleados</p>
                  <h3 className="text-4xl font-bold text-foreground">842</h3>
                  <p className="text-sm text-blue-500">+12 nuevos este mes</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Cost */}
          <Card className="border-l-4 border-l-red-500 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Costo de Nómina</p>
                  <h3 className="text-4xl font-bold text-foreground">$84,245</h3>
                  <p className="text-sm text-red-500">+5.4% del mes pasado</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Present Today */}
          <Card className="border-l-4 border-l-green-500 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Presentes Hoy</p>
                  <h3 className="text-4xl font-bold text-foreground">96.8%</h3>
                  <p className="text-sm text-green-500">Llegada a tiempo</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Late/Absent */}
          <Card className="border-l-4 border-l-orange-500 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tarde / Ausente</p>
                  <h3 className="text-4xl font-bold text-foreground">24</h3>
                  <p className="text-sm text-orange-500">Requiere acción</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Overview */}
          <Card className="lg:col-span-2 bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resumen de Asistencia</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Presentes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span className="text-muted-foreground">Tarde</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="present" fill="hsl(220 91% 56%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost by Department */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Costo por Depto.</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costByDept}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {costByDept.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-4">
                <p className="text-2xl font-bold text-foreground">Total</p>
                <p className="text-sm text-muted-foreground">Nómina</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Check-ins Section */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Fichadas en Vivo</CardTitle>
              </div>
              <Button variant="link" className="text-primary">
                Ver Todo el Registro
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground uppercase">
                      Empleado
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground uppercase">
                      Departamento
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground uppercase">
                      Hora de Entrada
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground uppercase">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground uppercase">
                      ID Nómina
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {liveCheckIns.map((checkIn) => (
                    <tr key={checkIn.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {checkIn.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{checkIn.name}</p>
                            <p className="text-sm text-muted-foreground">{checkIn.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-foreground">{checkIn.department}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-foreground">{checkIn.timeIn}</p>
                      </td>
                      <td className="py-4 px-4">
                        {checkIn.status === "on-time" ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0">
                            A Tiempo
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-0">
                            Tarde ({checkIn.lateMinutes}m)
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-muted-foreground font-mono text-sm">{checkIn.payrollId}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
