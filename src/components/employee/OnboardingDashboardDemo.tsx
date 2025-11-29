import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// Mock data
const attendanceData = [
  { day: "Mon", present: 65, late: 3 },
  { day: "Tue", present: 58, late: 5 },
  { day: "Wed", present: 78, late: 2 },
  { day: "Thu", present: 81, late: 1 },
  { day: "Fri", present: 55, late: 8 },
  { day: "Sat", present: 53, late: 4 },
  { day: "Sun", present: 42, late: 6 },
  { day: "Mon", present: 68, late: 4 },
  { day: "Tue", present: 72, late: 3 },
  { day: "Wed", present: 79, late: 2 },
  { day: "Thu", present: 85, late: 1 },
  { day: "Fri", present: 88, late: 2 },
  { day: "Sat", present: 84, late: 3 },
];

const costByDept = [
  { name: "Sales", value: 35000, color: "hsl(var(--chart-1))" },
  { name: "Operations", value: 28000, color: "hsl(var(--chart-2))" },
  { name: "Support", value: 21245, color: "hsl(var(--chart-3))" },
];

export const OnboardingDashboardDemo = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Payroll & Attendance</h1>
          <p className="text-muted-foreground">
            Overview for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <Card className="border-l-4 border-l-blue-500 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <h3 className="text-4xl font-bold text-foreground">842</h3>
                  <p className="text-sm text-blue-500">+12 New this month</p>
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
                  <p className="text-sm text-muted-foreground">Payroll Cost</p>
                  <h3 className="text-4xl font-bold text-foreground">$84,245</h3>
                  <p className="text-sm text-red-500">+5.4% from last month</p>
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
                  <p className="text-sm text-muted-foreground">Present Today</p>
                  <h3 className="text-4xl font-bold text-foreground">96.8%</h3>
                  <p className="text-sm text-green-500">On time arrival</p>
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
                  <p className="text-sm text-muted-foreground">Late / Absent</p>
                  <h3 className="text-4xl font-bold text-foreground">24</h3>
                  <p className="text-sm text-orange-500">Action required</p>
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
                <CardTitle>Attendance Overview</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span className="text-muted-foreground">Late</span>
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
              <CardTitle>Cost by Dept.</CardTitle>
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
                <p className="text-sm text-muted-foreground">Payroll</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
