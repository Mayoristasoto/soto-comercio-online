

## Plan: Input Editable + Calendar Picker para Fecha de Ingreso

### Objetivo
Modificar la celda de "Fecha Ingreso" para permitir dos formas de edicion:
1. **Escribir directamente** la fecha en formato `dd/MM/yyyy`
2. **Seleccionar del calendario** con el picker existente

---

### Cambios en `src/pages/EditorFechasIngreso.tsx`

#### 1. Nuevo Componente Inline: `EditableDateCell`

Crear un componente interno que combine:
- Un `Input` de texto editable para escribir la fecha
- Un boton de calendario que abre el `Popover` con el `Calendar`

```
+----------------------------------+
| [ 25/06/2024  ] [icono calendario]|
+----------------------------------+
```

#### 2. Estructura del componente

```tsx
// Dentro del archivo, antes del return principal
const EditableDateCell = ({ 
  empleadoId, 
  fechaActual, 
  onFechaChange 
}: { 
  empleadoId: string; 
  fechaActual: Date | null; 
  onFechaChange: (id: string, fecha: Date | undefined) => void;
}) => {
  const [inputValue, setInputValue] = useState(
    fechaActual ? format(fechaActual, "dd/MM/yyyy") : ""
  );
  const [isOpen, setIsOpen] = useState(false);

  // Sincronizar cuando cambia la fecha externa
  useEffect(() => {
    setInputValue(fechaActual ? format(fechaActual, "dd/MM/yyyy") : "");
  }, [fechaActual]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Intentar parsear cuando tiene formato completo
    if (value.length === 10) {
      try {
        const parsed = parse(value, "dd/MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) {
          onFechaChange(empleadoId, parsed);
        }
      } catch {
        // Ignorar errores de parseo
      }
    }
  };

  const handleInputBlur = () => {
    // Al salir del input, intentar parsear
    if (inputValue.trim() === "") {
      onFechaChange(empleadoId, undefined);
      return;
    }
    try {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (!isNaN(parsed.getTime())) {
        onFechaChange(empleadoId, parsed);
      } else {
        // Revertir al valor original si no es valido
        setInputValue(fechaActual ? format(fechaActual, "dd/MM/yyyy") : "");
      }
    } catch {
      setInputValue(fechaActual ? format(fechaActual, "dd/MM/yyyy") : "");
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onFechaChange(empleadoId, date);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleInputBlur}
        placeholder="dd/mm/aaaa"
        className="w-[110px] h-9 text-sm"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Calendar className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={fechaActual || undefined}
            onSelect={handleCalendarSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
```

#### 3. Reemplazar celda actual

Cambiar la celda de "Fecha Ingreso" (lineas 556-584) por:

```tsx
<TableCell>
  <EditableDateCell
    empleadoId={empleado.id}
    fechaActual={empleado.fecha_ingreso_nueva}
    onFechaChange={handleFechaChange}
  />
</TableCell>
```

---

### Comportamiento

| Accion | Resultado |
|--------|-----------|
| Escribir `25/06/2024` | Parsea automaticamente al completar 10 caracteres |
| Escribir fecha invalida | Al salir del campo, revierte al valor anterior |
| Borrar el campo | Establece fecha como `null` (sin fecha) |
| Click en icono calendario | Abre picker para seleccionar visualmente |
| Seleccionar en calendario | Actualiza input y cierra popover |

---

### Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/EditorFechasIngreso.tsx` | Agregar componente `EditableDateCell` y reemplazar celda de fecha |

---

### Resultado Visual

```
+--------------------------------------------------+
| Fecha Ingreso                                     |
+--------------------------------------------------+
| [ 25/06/2024  ] [📅]  <- Input editable + picker |
| [ 31/07/2022  ] [📅]                              |
| [ 30/11/2023  ] [📅]                              |
+--------------------------------------------------+
```

El usuario podra:
1. Hacer click en el input y escribir/modificar la fecha directamente
2. O hacer click en el icono de calendario para seleccionar visualmente

