import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Trophy,
  Target,
  Clock,
  Award,
  ClipboardCheck,
  BookOpen,
  HelpCircle,
  Settings
} from 'lucide-react'

interface SearchItem {
  id: string
  title: string
  description?: string
  category: string
  path: string
  icon: any
  keywords?: string[]
}

interface GlobalSearchProps {
  userRole?: string
}

export function GlobalSearch({ userRole }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const isAdmin = userRole === 'admin_rrhh'
  const isGerente = userRole === 'gerente_sucursal'

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const allItems: SearchItem[] = [
    // Dashboard
    {
      id: 'dashboard',
      title: 'Dashboard Principal',
      description: 'Vista general del sistema',
      category: 'General',
      path: '/dashboard',
      icon: LayoutDashboard,
      keywords: ['inicio', 'home', 'principal']
    },
    {
      id: 'mi-dashboard',
      title: 'Mi Dashboard',
      description: 'Mi espacio personal',
      category: 'General',
      path: '/mi-dashboard',
      icon: LayoutDashboard,
      keywords: ['personal', 'mi', 'inicio']
    },

    // RRHH - Solo admin y gerentes
    ...(isAdmin || isGerente ? [
      {
        id: 'evaluaciones',
        title: 'Evaluaciones',
        description: 'Gestión de evaluaciones de desempeño',
        category: 'RRHH',
        path: '/rrhh/evaluaciones',
        icon: ClipboardCheck,
        keywords: ['evaluacion', 'desempeño', 'calificacion']
      },
      {
        id: 'solicitudes',
        title: 'Solicitudes',
        description: 'Gestión de solicitudes de empleados',
        category: 'RRHH',
        path: '/rrhh/solicitudes',
        icon: FileText,
        keywords: ['permisos', 'ausencias', 'solicitud']
      },
      {
        id: 'anotaciones',
        title: 'Anotaciones',
        description: 'Registro de anotaciones de empleados',
        category: 'RRHH',
        path: '/rrhh/anotaciones',
        icon: FileText,
        keywords: ['notas', 'registro', 'observaciones']
      },
      {
        id: 'nomina',
        title: 'Nómina',
        description: 'Gestión de empleados y documentos',
        category: 'RRHH',
        path: '/rrhh/nomina',
        icon: Users,
        keywords: ['empleados', 'personal', 'documentos']
      }
    ] : []),

    // Vacaciones - Todos
    {
      id: 'vacaciones',
      title: 'Vacaciones',
      description: 'Solicitud y gestión de vacaciones',
      category: 'RRHH',
      path: '/rrhh/vacaciones',
      icon: Calendar,
      keywords: ['vacaciones', 'dias', 'solicitud', 'calendario']
    },

    // Operaciones - Admin y gerentes
    ...(isAdmin || isGerente ? [
      {
        id: 'fichero',
        title: 'Fichero',
        description: 'Control de asistencia y horarios',
        category: 'Operaciones',
        path: '/operaciones/fichero',
        icon: Clock,
        keywords: ['asistencia', 'horarios', 'fichaje', 'entrada', 'salida']
      },
      {
        id: 'fichero-metricas',
        title: 'Métricas de Fichaje',
        description: 'Análisis de puntualidad y asistencia',
        category: 'Operaciones',
        path: '/operaciones/fichero/metricas',
        icon: Target,
        keywords: ['metricas', 'estadisticas', 'puntualidad']
      },
      {
        id: 'fichero-reportes',
        title: 'Reportes de Horarios',
        description: 'Reportes y análisis de distribución',
        category: 'Operaciones',
        path: '/operaciones/fichero/reportes',
        icon: FileText,
        keywords: ['reportes', 'cobertura', 'distribucion']
      }
    ] : []),

    // Tareas - Todos
    {
      id: 'tareas',
      title: 'Tareas',
      description: 'Gestión de tareas asignadas',
      category: 'Operaciones',
      path: '/operaciones/tareas',
      icon: Target,
      keywords: ['tareas', 'pendientes', 'asignaciones']
    },

    // Reconocimiento - Todos
    {
      id: 'ranking',
      title: 'Ranking',
      description: 'Clasificación de empleados',
      category: 'Reconocimiento',
      path: '/reconoce/ranking',
      icon: Trophy,
      keywords: ['ranking', 'puntos', 'clasificacion', 'top']
    },
    {
      id: 'desafios',
      title: 'Desafíos',
      description: 'Desafíos activos y participación',
      category: 'Reconocimiento',
      path: '/reconoce/desafios',
      icon: Target,
      keywords: ['desafios', 'retos', 'competencia']
    },
    {
      id: 'premios',
      title: 'Premios',
      description: 'Catálogo de premios',
      category: 'Reconocimiento',
      path: '/reconoce/premios',
      icon: Award,
      keywords: ['premios', 'recompensas', 'canje']
    },
    {
      id: 'insignias',
      title: 'Insignias',
      description: 'Logros y medallas obtenidas',
      category: 'Reconocimiento',
      path: '/reconoce/insignias',
      icon: Award,
      keywords: ['insignias', 'logros', 'medallas', 'achievements']
    },

    // Ayuda
    {
      id: 'ayuda',
      title: 'Centro de Ayuda',
      description: 'Preguntas frecuentes y tutoriales',
      category: 'Ayuda',
      path: '#',
      icon: HelpCircle,
      keywords: ['ayuda', 'help', 'soporte', 'tutorial', 'faq']
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      description: 'Ajustes de la aplicación',
      category: 'General',
      path: '/configuracion',
      icon: Settings,
      keywords: ['configuracion', 'ajustes', 'settings', 'preferencias']
    }
  ]

  const handleSelect = (path: string) => {
    setOpen(false)
    if (path !== '#') {
      navigate(path)
    }
  }

  // Agrupar por categoría
  const categories = Array.from(new Set(allItems.map(item => item.category)))

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Buscar páginas, funciones..." 
        className="h-12 border-0 focus-visible:ring-0"
      />
      <CommandList className="max-h-[450px]">
        <CommandEmpty className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">
            No se encontraron resultados
          </p>
          <p className="text-xs text-muted-foreground">
            Intenta con otros términos de búsqueda
          </p>
        </CommandEmpty>
        
        {categories.map((category, index) => {
          const items = allItems.filter(item => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category}>
              <CommandGroup heading={category} className="px-2">
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.description} ${item.keywords?.join(' ')}`}
                      onSelect={() => handleSelect(item.path)}
                      className="cursor-pointer rounded-md px-3 py-3 aria-selected:bg-accent/50"
                    >
                      <Icon className="mr-3 h-5 w-5 text-primary shrink-0" />
                      <div className="flex flex-col gap-0.5 flex-1">
                        <span className="font-medium text-sm">{item.title}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {index < categories.length - 1 && <CommandSeparator className="my-1" />}
            </div>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
