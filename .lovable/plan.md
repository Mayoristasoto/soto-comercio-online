
# Reporte de Llegadas Tarde de Gerentes de Sucursal (descargable en XLSX)

## Contexto del problema

El usuario quiere un reporte específico de **gerentes de sucursal** con:
- Detalle de cada llegada tarde día por día
- Total de minutos tarde por gerente
- Porcentaje de días con llegada tarde
- Exportable en XLSX

Los datos ya existen en `empleado_cruces_rojas` con `tipo_infraccion = 'llegada_tarde'`. Ya confirmé con la base de datos real que hay 3 gerentes con incidencias en febrero 2026:
- **Julio Gomez Navarrete** (José Martí): 5 llegadas, 731 min totales, 25% de los días
- **Carlos Espina** (José Martí): 6 llegadas, 128 min totales, 30% de los días
- **Analia Del valle** (Juan B. Justo): 1 llegada, 34 min totales, 5% de los días

## Solución

Se crea una nueva página `src/pages/ReporteLlegadasTardeGerentes.tsx` accesible desde el sidebar/navegación, con toda la funcionalidad de reporte.

## Estructura del Excel descargable

El archivo XLSX tendrá **3 hojas**:

**Hoja 1 - "Resumen"**: Una fila por gerente con:
| Gerente | Sucursal | Días tarde | % Días tarde | Total minutos tarde | Promedio min/día tarde |

**Hoja 2 - "Detalle por Día"**: Una fila por cada llegada tarde con:
| Gerente | Sucursal | Fecha | Día semana | Hora programada | Hora real | Minutos tarde |

**Hoja 3 - "Calendario"**: Vista matricial donde cada columna es un día del mes y cada fila es un gerente, con el valor de minutos en la celda (vacío si llegó a tiempo).

## Detalle técnico del componente

### Estados
```typescript
const [fechaDesde, setFechaDesde] = useState(inicio del mes actual)
const [fechaHasta, setFechaHasta] = useState(hoy)
const [gerentes, setGerentes] = useState<GerenteReporte[]>([])
const [loading, setLoading] = useState(true)
const [diasHabiles, setDiasHabiles] = useState(20) // configurable
```

### Interface de datos
```typescript
interface LlegadaTarde {
  fecha: string
  minutos: number
  observaciones: string // contiene hora programada y hora real
}

interface GerenteReporte {
  id: string
  nombre: string
  apellido: string
  sucursal: string
  llegadasTarde: LlegadaTarde[]
  totalMinutos: number
  cantidadVeces: number
  porcentaje: number
}
```

### Query a Supabase
```typescript
supabase
  .from('empleado_cruces_rojas')
  .select(`
    id, empleado_id, fecha_infraccion, minutos_diferencia, observaciones,
    empleados!empleado_cruces_rojas_empleado_id_fkey(
      nombre, apellido, rol, sucursales(nombre)
    )
  `)
  .eq('tipo_infraccion', 'llegada_tarde')
  .eq('anulada', false)
  .gte('fecha_infraccion', fechaDesde)
  .lte('fecha_infraccion', fechaHasta + 'T23:59:59')
  .eq('empleados.rol', 'gerente_sucursal') // filtro en JS post-query
```

### Extracción de hora real desde observaciones
El campo `observaciones` tiene formato: `"Llegada tarde en kiosco: 10:37 a. m. (programado: 10:30, tolerancia: 1 min)"`, entonces se parsea con regex para extraer:
- Hora real: primer match de hora al inicio
- Hora programada: valor después de "programado:"

### UI del componente

**Cabecera**: título + selector de fechas (desde/hasta) + campo "Días hábiles del período" (editable para el % de cálculo) + botón "Descargar XLSX"

**Tabla de resumen** (cards con métricas):
- Total gerentes con incidencias
- Total llegadas tarde
- Total minutos acumulados
- Gerente con más incidencias

**Tabla principal** con columnas expandibles:
| Gerente | Sucursal | Llegadas Tarde | Total Min | % Días Tarde | Días detalle... |
- Cada fila puede expandirse para ver el detalle día a día
- Los días con > 60 minutos se marcan en rojo
- Los días con 1-30 minutos en amarillo

**Función de exportación XLSX** con 3 hojas como se describió arriba, columnas con anchos configurados y header row destacado.

## Archivos a modificar

### 1. Nuevo archivo: `src/pages/ReporteLlegadasTardeGerentes.tsx`
Componente completo con todas las funcionalidades descritas.

### 2. `src/App.tsx`
Agregar import y ruta `/reporte-gerentes-tarde` protegida (solo admin_rrhh).

### 3. `src/components/AppSidebar.tsx` (o `UnifiedSidebar.tsx`)
Agregar enlace al reporte en la sección de Fichero/Reportes para admin_rrhh.

## Sin cambios en base de datos
Toda la información ya existe en `empleado_cruces_rojas`. No se requieren migraciones.
