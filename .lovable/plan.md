

## Plan: PDF Resumen Semanal Rápido de Incidencias

### Objetivo
Crear un botón en la página de Listado de Incidencias que genere un PDF de visualización rápida con el resumen de la semana: llegadas tarde, excesos de descanso y empleados que no ficharon.

### Archivo nuevo
**`src/utils/resumenSemanalPDF.ts`** — Genera un PDF compacto de 1-2 páginas con:

1. **Encabezado**: Logo SOTO, título "Resumen Semanal de Incidencias", rango de fechas
2. **Cards de resumen**: Total llegadas tarde, total excesos descanso, total ausencias/sin fichaje
3. **Tabla resumen por empleado**: Nombre | Sucursal | Llegadas Tarde | Exceso Descanso | Total — ordenada por total desc
4. **Sección "Empleados sin fichaje"**: Lista de empleados que no registraron entrada en algún día de la semana (cruzando `fichajes` con `empleados` activos y sus horarios asignados)

Usa `jsPDF` + `autoTable` con los estilos de `pdfStyles.ts` existentes. Consulta `empleado_cruces_rojas` para incidencias y `fichajes` para detectar ausencias.

### Archivo modificado
**`src/pages/ListadoIncidencias.tsx`** — Agregar un botón "📄 Resumen Semanal PDF" junto a los controles existentes que:
- Calcula automáticamente lunes-domingo de la semana actual (o la semana del rango seleccionado)
- Consulta `empleado_cruces_rojas` agrupando por empleado y tipo
- Consulta `fichajes` para detectar empleados sin registro
- Llama a `generarResumenSemanalPDF()` con los datos

### Estructura del PDF

```text
┌─────────────────────────────────┐
│  SOTO mayorista                 │
│  Resumen Semanal de Incidencias │
│  Lunes 03/03 - Domingo 09/03   │
├─────────────────────────────────┤
│ [12 Lleg.Tarde] [5 Exc.Desc]   │
│ [3 Sin Fichaje] [20 Total]     │
├─────────────────────────────────┤
│ # │ Empleado │ Suc │ LT │ED│Tot│
│ 1 │ Carlos E │ JM  │  4 │ 2│ 6 │
│ 2 │ Julio G  │ JM  │  3 │ 1│ 4 │
│ ...                             │
├─────────────────────────────────┤
│ Empleados sin fichaje           │
│ Fecha    │ Empleado │ Sucursal  │
│ 03/03    │ Ana D.   │ Centro    │
│ ...                             │
└─────────────────────────────────┘
```

