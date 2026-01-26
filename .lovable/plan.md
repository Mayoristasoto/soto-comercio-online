

## Plan: Corregir Sincronizacion de Fechas al Guardar

### Problema Identificado
Cuando se guarda un cambio en la fecha de ingreso, el estado local se actualiza incorrectamente. El campo `fecha_ingreso` (string) se actualiza, pero `fecha_ingreso_nueva` (Date) no se reconstruye a partir del nuevo valor, causando inconsistencias en la visualizacion.

### Solucion

**Archivo:** `src/pages/EditorFechasIngreso.tsx`

#### Cambio 1: Corregir `handleGuardarIndividual` (lineas 276-286)

Problema actual: El codigo actualiza `fecha_ingreso` pero no reconstruye `fecha_ingreso_nueva` desde ese valor.

```tsx
// ANTES (lineas 276-286)
setEmpleados(prev => prev.map(e => 
  e.id === empleado.id 
    ? { 
        ...e, 
        fecha_ingreso: empleado.fecha_ingreso_nueva 
          ? format(empleado.fecha_ingreso_nueva, "yyyy-MM-dd") 
          : null,
        modificado: false 
      }
    : e
));

// DESPUES
setEmpleados(prev => prev.map(e => {
  if (e.id !== empleado.id) return e;
  
  const nuevaFechaStr = empleado.fecha_ingreso_nueva 
    ? format(empleado.fecha_ingreso_nueva, "yyyy-MM-dd") 
    : null;
  
  return {
    ...e,
    fecha_ingreso: nuevaFechaStr,
    fecha_ingreso_nueva: nuevaFechaStr ? new Date(nuevaFechaStr + "T00:00:00") : null,
    modificado: false,
  };
}));
```

#### Cambio 2: Corregir `handleGuardarTodos` (lineas 328-334)

```tsx
// ANTES (lineas 328-334)
setEmpleados(prev => prev.map(e => ({
  ...e,
  fecha_ingreso: e.fecha_ingreso_nueva 
    ? format(e.fecha_ingreso_nueva, "yyyy-MM-dd") 
    : null,
  modificado: false,
})));

// DESPUES
setEmpleados(prev => prev.map(e => {
  const nuevaFechaStr = e.fecha_ingreso_nueva 
    ? format(e.fecha_ingreso_nueva, "yyyy-MM-dd") 
    : null;
  
  return {
    ...e,
    fecha_ingreso: nuevaFechaStr,
    fecha_ingreso_nueva: nuevaFechaStr ? new Date(nuevaFechaStr + "T00:00:00") : null,
    modificado: false,
  };
}));
```

---

### Explicacion Tecnica

El problema es que despues de guardar:
1. `fecha_ingreso` se actualiza como string `"2024-06-26"`
2. `fecha_ingreso_nueva` mantiene el objeto `Date` original
3. Cuando `EditableDateCell` recibe la prop, el `useEffect` no detecta cambio porque el timestamp es el mismo
4. Pero internamente hay desincronizacion entre el estado guardado y lo mostrado

La solucion reconstruye `fecha_ingreso_nueva` a partir de la fecha string guardada, asegurando consistencia completa entre ambos campos.

---

### Resumen de Cambios

| Archivo | Lineas | Cambio |
|---------|--------|--------|
| `src/pages/EditorFechasIngreso.tsx` | 276-286 | Reconstruir `fecha_ingreso_nueva` al guardar individual |
| `src/pages/EditorFechasIngreso.tsx` | 328-334 | Reconstruir `fecha_ingreso_nueva` al guardar todos |

---

### Resultado Esperado

Despues de hacer clic en "Guardar" o "Guardar Todos":
- La fecha editada permanece visible correctamente
- El indicador "Modificado" desaparece
- Los campos `fecha_ingreso` y `fecha_ingreso_nueva` quedan sincronizados
- Legajo 25 y cualquier otro empleado mantendran sus fechas editadas

