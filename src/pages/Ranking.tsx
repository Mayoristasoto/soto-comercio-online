import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Trophy, 
  Medal, 
  Award, 
  Search, 
  Crown,
  Star,
  TrendingUp,
  Users,
  Building2
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface RankingEntry {
  posicion: number
  empleado_id: string
  nombre: string
  apellido: string
  avatar_url?: string
  puntos: number
  sucursal?: string
  grupo?: string
  racha?: number
  badge?: string
}

interface Periodo {
  label: string
  value: string
  fechaInicio: string
  fechaFin: string
}

export default function Ranking() {
  const { toast } = useToast()
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPeriodo, setSelectedPeriodo] = useState("mensual")
  const [selectedSucursal, setSelectedSucursal] = useState("todas")
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Generar períodos disponibles
  const periodos: Periodo[] = [
    {
      label: "Esta Semana",
      value: "semanal",
      fechaInicio: getStartOfWeek().toISOString(),
      fechaFin: new Date().toISOString()
    },
    {
      label: "Este Mes",
      value: "mensual", 
      fechaInicio: getStartOfMonth().toISOString(),
      fechaFin: new Date().toISOString()
    },
    {
      label: "Este Semestre",
      value: "semestral",
      fechaInicio: getStartOfSemester().toISOString(),
      fechaFin: new Date().toISOString()
    },
    {
      label: "Este Año",
      value: "anual",
      fechaInicio: getStartOfYear().toISOString(),
      fechaFin: new Date().toISOString()
    }
  ]

  useEffect(() => {
    loadRanking()
  }, [selectedPeriodo, selectedSucursal])

  function getStartOfWeek(): Date {
    const date = new Date()
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Lunes como primer día
    return new Date(date.setDate(diff))
  }

  function getStartOfMonth(): Date {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  }

  function getStartOfSemester(): Date {
    const month = new Date().getMonth()
    const semesterStart = month < 6 ? 0 : 6
    return new Date(new Date().getFullYear(), semesterStart, 1)
  }

  function getStartOfYear(): Date {
    return new Date(new Date().getFullYear(), 0, 1)
  }

  const loadRanking = async () => {
    setLoading(true)
    try {
      const periodo = periodos.find(p => p.value === selectedPeriodo)
      if (!periodo) return

      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      let currentEmpleadoId = null
      
      if (user) {
        const { data: currentEmpleado } = await supabase
          .from('empleados')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (currentEmpleado) {
          currentEmpleadoId = currentEmpleado.id
          setCurrentUserId(currentEmpleado.id)
        }
      }

      // Construir query base para puntos
      let puntosQuery = supabase
        .from('puntos')
        .select(`
          empleado_id,
          puntos,
          empleado:empleados(
            nombre,
            apellido,
            avatar_url,
            sucursal:sucursales(nombre),
            grupo:grupos(nombre)
          )
        `)
        .gte('fecha', periodo.fechaInicio)
        .lte('fecha', periodo.fechaFin)

      const { data: puntosData, error: puntosError } = await puntosQuery

      if (puntosError) throw puntosError

      // Procesar y agrupar puntos por empleado
      const puntosGrouped = new Map<string, {
        empleado: any,
        totalPuntos: number
      }>()

      puntosData?.forEach(punto => {
        const empleadoId = punto.empleado_id
        if (!puntosGrouped.has(empleadoId)) {
          puntosGrouped.set(empleadoId, {
            empleado: punto.empleado,
            totalPuntos: 0
          })
        }
        puntosGrouped.get(empleadoId)!.totalPuntos += punto.puntos
      })

      // Convertir a array y ordenar
      let rankingData: RankingEntry[] = Array.from(puntosGrouped.entries())
        .map(([empleadoId, data]) => ({
          empleado_id: empleadoId,
          nombre: data.empleado.nombre,
          apellido: data.empleado.apellido,
          avatar_url: data.empleado.avatar_url,
          puntos: data.totalPuntos,
          sucursal: data.empleado.sucursal?.nombre,
          grupo: data.empleado.grupo?.nombre,
          posicion: 0, // Se asignará después
          racha: Math.floor(Math.random() * 5) + 1, // Mock por ahora
          badge: undefined // Se asignará según posición
        }))
        .sort((a, b) => b.puntos - a.puntos)

      // Asignar posiciones y badges
      rankingData.forEach((entry, index) => {
        entry.posicion = index + 1
        
        // Asignar badges especiales
        if (index === 0) entry.badge = "Campeón"
        else if (index === 1) entry.badge = "Subcampeón"
        else if (index === 2) entry.badge = "Tercer Lugar"
        else if (index < 10) entry.badge = "Top 10"
      })

      // Filtrar por sucursal si está seleccionada
      if (selectedSucursal !== "todas") {
        rankingData = rankingData.filter(entry => entry.sucursal === selectedSucursal)
        // Reordenar posiciones después del filtro
        rankingData.forEach((entry, index) => {
          entry.posicion = index + 1
        })
      }

      setRankings(rankingData)

      // Encontrar posición del usuario actual
      if (currentEmpleadoId) {
        const userEntry = rankingData.find(entry => entry.empleado_id === currentEmpleadoId)
        setCurrentUserPosition(userEntry?.posicion || null)
      }

    } catch (error) {
      console.error('Error cargando ranking:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el ranking",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredRankings = rankings.filter(entry =>
    `${entry.nombre} ${entry.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.sucursal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.grupo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPodiumIcon = (posicion: number) => {
    switch (posicion) {
      case 1: return <Crown className="h-6 w-6 text-yellow-500" />
      case 2: return <Medal className="h-6 w-6 text-gray-400" />
      case 3: return <Award className="h-6 w-6 text-orange-500" />
      default: return null
    }
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case "Campeón": return "bg-yellow-100 text-yellow-800"
      case "Subcampeón": return "bg-gray-100 text-gray-800"
      case "Tercer Lugar": return "bg-orange-100 text-orange-800"
      case "Top 10": return "bg-blue-100 text-blue-800"
      default: return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <span>Ranking</span>
          </h1>
          <p className="text-muted-foreground">
            Clasificación de empleados por puntos obtenidos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado, sucursal o grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {periodos.map(periodo => (
                  <SelectItem key={periodo.value} value={periodo.value}>
                    {periodo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sucursales</SelectItem>
                <SelectItem value="José Martí">José Martí</SelectItem>
                <SelectItem value="Juan B. Justo">Juan B. Justo</SelectItem>
                <SelectItem value="Constitución">Constitución</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Podio Top 3 */}
      {filteredRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <span>Podio - Top 3</span>
            </CardTitle>
            <CardDescription>
              Los mejores empleados del {periodos.find(p => p.value === selectedPeriodo)?.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredRankings.slice(0, 3).map((entry, index) => (
                <div 
                  key={entry.empleado_id}
                  className={`relative p-6 rounded-lg border-2 text-center ${
                    index === 0 ? 'border-yellow-300 bg-yellow-50' :
                    index === 1 ? 'border-gray-300 bg-gray-50' :
                    'border-orange-300 bg-orange-50'
                  }`}
                >
                  <div className="flex justify-center mb-4">
                    {getPodiumIcon(entry.posicion)}
                  </div>
                  
                  <Avatar className="h-16 w-16 mx-auto mb-4">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback>
                      {entry.nombre[0]}{entry.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-semibold text-lg">
                    {entry.nombre} {entry.apellido}
                  </h3>
                  
                  <div className="text-2xl font-bold text-primary mb-2">
                    {entry.puntos} pts
                  </div>
                  
                  {entry.badge && (
                    <Badge className={getBadgeColor(entry.badge)}>
                      {entry.badge}
                    </Badge>
                  )}
                  
                  <div className="mt-3 text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center justify-center space-x-1">
                      <Building2 className="h-3 w-3" />
                      <span>{entry.sucursal}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{entry.grupo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tu Posición */}
      {currentUserPosition && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">Tu posición actual:</span>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                #{currentUserPosition}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Completo */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo</CardTitle>
          <CardDescription>
            Clasificación de todos los empleados del período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRankings.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No hay datos de ranking para el período seleccionado
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRankings.map((entry, index) => (
                <div 
                  key={entry.empleado_id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border ${
                    entry.empleado_id === currentUserId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Posición */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                    {entry.posicion <= 3 ? getPodiumIcon(entry.posicion) : entry.posicion}
                  </div>
                  
                  {/* Avatar y nombre */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback>
                      {entry.nombre[0]}{entry.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="font-semibold">
                      {entry.nombre} {entry.apellido}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.sucursal} • {entry.grupo}
                    </div>
                  </div>
                  
                  {/* Badge */}
                  {entry.badge && (
                    <Badge className={getBadgeColor(entry.badge)}>
                      {entry.badge}
                    </Badge>
                  )}
                  
                  {/* Racha */}
                  {entry.racha && entry.racha > 1 && (
                    <div className="flex items-center space-x-1 text-sm text-orange-600">
                      <Star className="h-4 w-4" />
                      <span>{entry.racha}x</span>
                    </div>
                  )}
                  
                  {/* Puntos */}
                  <div className="text-right">
                    <div className="font-bold text-lg">{entry.puntos}</div>
                    <div className="text-sm text-muted-foreground">puntos</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}