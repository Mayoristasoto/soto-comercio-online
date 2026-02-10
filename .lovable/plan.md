
# Editar Email y Fecha de Ingreso desde el Perfil del Empleado

## Cambios

**Archivo: `src/components/admin/EmployeeProfile.tsx`**

### 1. Agregar campo Email editable en la seccion "Laboral"
En la pestaña "Laboral" (tab "work"), se agregara un campo de email editable con icono de Mail, junto al campo de legajo. Se importara el icono `Mail` de lucide-react.

### 2. Hacer editable la Fecha de Ingreso
El campo "Fecha de Ingreso" (lineas 567-574) actualmente esta deshabilitado y muestra la fecha formateada. Se cambiara a un input tipo `date` editable que use `formData.fecha_ingreso` en lugar del valor fijo de `empleado.fecha_ingreso`.

### 3. Incluir email y fecha_ingreso en la funcion de guardado
En `handleSave` (linea 193), el objeto `empleadoUpdate` actualmente solo incluye nombre, apellido, legajo, puesto, puesto_id y sucursal_id. Se agregaran los campos `email` y `fecha_ingreso` para que se persistan al guardar.

## Detalle tecnico

**Import** (linea 12-24): Agregar `Mail` a los iconos importados de lucide-react.

**Campo Email** - Se insertara en la seccion Laboral, en un grid junto al legajo:
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <div className="relative">
    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input
      id="email"
      type="email"
      value={formData.email || ''}
      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
      className="pl-10"
      placeholder="email@ejemplo.com"
    />
  </div>
</div>
```

**Fecha de Ingreso** - Cambiar de disabled a editable:
```tsx
<div className="space-y-2">
  <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
  <div className="relative">
    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input
      id="fecha_ingreso"
      type="date"
      value={formData.fecha_ingreso || ''}
      onChange={(e) => setFormData(prev => ({ ...prev, fecha_ingreso: e.target.value }))}
      className="pl-10"
    />
  </div>
</div>
```

**handleSave** - Agregar al objeto `empleadoUpdate`:
```ts
email: formData.email,
fecha_ingreso: formData.fecha_ingreso,
```

No se requieren cambios en base de datos ya que ambos campos (`email` y `fecha_ingreso`) ya existen en la tabla `empleados`.
