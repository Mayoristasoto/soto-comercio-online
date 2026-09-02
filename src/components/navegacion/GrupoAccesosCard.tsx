import { NavLink } from "react-router-dom"
import * as LucideIcons from "lucide-react"
import { FileText, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface AccesoSeccion {
  path: string
  nombre: string
  icon?: string | null
  descripcion?: string | null
}

export interface GrupoAccesos {
  id: string
  nombre: string
  icon?: string | null
  secciones: AccesoSeccion[]
}

const resolveIcon = (name?: string | null) => {
  if (!name) return FileText
  const Icon = (LucideIcons as unknown as Record<string, any>)[name]
  return Icon || FileText
}

export function GrupoAccesosCard({ grupo }: { grupo: GrupoAccesos }) {
  const GroupIcon = resolveIcon(grupo.icon)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GroupIcon className="h-4 w-4" />
            </span>
            {grupo.nombre}
          </span>
          <Badge variant="secondary">{grupo.secciones.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {grupo.secciones.map((seccion) => {
          const Icon = resolveIcon(seccion.icon)
          return (
            <NavLink
              key={`${grupo.id}-${seccion.path}`}
              to={seccion.path}
              className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{seccion.nombre}</span>
                {seccion.descripcion && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {seccion.descripcion}
                  </span>
                )}
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </NavLink>
          )
        })}
      </CardContent>
    </Card>
  )
}
