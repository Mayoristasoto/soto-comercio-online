
# Exportar PDF con Emails y PINs (ultimos 4 del DNI) de todos los empleados

## Resumen

Se agregara una nueva funcion de exportacion que genera un PDF con el listado de todos los empleados activos, mostrando su email y los ultimos 4 digitos de su DNI como PIN de referencia. Esto no modifica ningun PIN existente, solo consulta los datos para generar el documento.

Se agregara un boton en el panel de gestion de PINs (`PinManagement`) para descargar este PDF.

## Cambios

### 1. Nueva funcion en `src/utils/pinsExportPDF.ts`

Agregar `exportarCredencialesEmpleadosPDF` que:
- Recibe un array de empleados con nombre, apellido, legajo, email y dni
- Genera un PDF con tabla: #, Empleado, Legajo, Email, PIN (ultimos 4 del DNI)
- Incluye instrucciones de primer acceso actualizadas (sin mencionar "pestaña PIN", solo email + PIN como contraseña)
- Sigue el mismo estilo visual que `exportarPinsBlanqueadosPDF`

### 2. Boton en `src/components/admin/PinManagement.tsx`

Agregar un boton "Exportar Credenciales PDF" que:
- Consulta todos los empleados activos con DNI y email desde la tabla `empleados`
- Filtra solo los que tienen DNI cargado (para poder mostrar el PIN)
- Llama a la nueva funcion de exportacion
- Muestra toast de exito/error

## Detalle tecnico

**Nueva funcion en `pinsExportPDF.ts`:**

```typescript
interface EmpleadoCredencial {
  nombre: string
  apellido: string
  legajo: string | null
  email: string
  dni: string
}

export const exportarCredencialesEmpleadosPDF = (empleados: EmpleadoCredencial[]): string => {
  // PDF con titulo "Credenciales de Acceso - Sistema SOTO"
  // Instrucciones actualizadas:
  //   1. Ingresar email en la pantalla de login
  //   2. Usar los ultimos 4 digitos del DNI como contraseña
  //   3. El sistema pedira crear una contraseña nueva
  // Tabla: #, Empleado, Legajo, Email, PIN (ultimos 4 del DNI)
  // Mismo estilo visual que exportarPinsBlanqueadosPDF
}
```

**Boton en PinManagement.tsx:**

```typescript
const exportarCredenciales = async () => {
  // 1. Query: select nombre, apellido, legajo, email, dni 
  //    from empleados where activo = true and dni is not null
  // 2. Calcular PIN = ultimos 4 digitos del DNI
  // 3. Llamar exportarCredencialesEmpleadosPDF(data)
}
```

Se ubicara junto a los botones existentes de "Blanquear PINs" y "Generar PINs".

No se requieren cambios en base de datos.
