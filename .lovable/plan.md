
# Reglas de Vacaciones: Bloqueo Diciembre y Receso Invernal

## Resumen

Se agregaran validaciones en el formulario de solicitud de vacaciones (`SolicitudVacaciones.tsx`) para aplicar las siguientes reglas:

1. **Diciembre bloqueado**: No se pueden solicitar vacaciones que incluyan dias de diciembre.
2. **Receso invernal (20 julio - 2 agosto)**: El empleado puede tomar como maximo 1 semana del receso. Si quiere 14 dias, debe combinar:
   - 1 semana previa + primera semana del receso (20-26 julio), o
   - Segunda semana del receso (27 julio - 2 agosto) + 1 semana posterior.

## Cambios

**Archivo: `src/components/vacaciones/SolicitudVacaciones.tsx`**

### 1. Nueva funcion de validacion de reglas

Se creara una funcion `validarReglasVacaciones(fechaInicio, fechaFin)` que retorna `{ valid: boolean, message: string | null }`. Esta funcion se ejecutara dentro del `useEffect` existente (junto a `checkConflicts`) y en `handleSubmit`.

**Regla Diciembre:**
- Si cualquier dia entre fechaInicio y fechaFin cae en diciembre (mes 11 en JS), se bloquea con mensaje: "No se pueden solicitar vacaciones en el mes de diciembre."

**Regla Receso Invernal:**
- Se definen las dos semanas del receso para el anio correspondiente:
  - Semana 1: 20 julio - 26 julio
  - Semana 2: 27 julio - 2 agosto
- Se calcula cuantos dias del receso cubre la solicitud y en que semanas cae.
- Si la solicitud cubre dias de ambas semanas del receso, se bloquea con mensaje explicativo.
- Si la solicitud dura 14 dias o mas y toca el receso, se valida que solo use una semana del receso y la otra semana sea previa (antes del 20/7) o posterior (despues del 2/8).

### 2. Integrar validacion en el flujo existente

- En el `useEffect` de lineas 44-51: despues de llamar `checkConflicts()`, llamar `validarReglasVacaciones()`. Si la validacion falla, se setea `warningMessage` y `hasConflict = true` para bloquear el envio.
- En `handleSubmit` (linea 120): agregar una verificacion adicional antes de insertar, como red de seguridad.

### 3. Mostrar informacion de reglas al usuario

Se agregara un bloque informativo debajo del titulo del dialog con las reglas resumidas, para que el empleado sepa las restricciones antes de elegir fechas.

## Detalle tecnico

```typescript
const validarReglasVacaciones = (inicio: Date, fin: Date): { valid: boolean; message: string } => {
  // Regla 1: Diciembre bloqueado
  // Iterar mes a mes entre inicio y fin, si alguno es diciembre -> bloquear
  
  // Regla 2: Receso invernal
  const anio = inicio.getFullYear();
  const recesoSemana1Inicio = new Date(anio, 6, 20); // 20 julio
  const recesoSemana1Fin = new Date(anio, 6, 26);     // 26 julio
  const recesoSemana2Inicio = new Date(anio, 6, 27);  // 27 julio
  const recesoSemana2Fin = new Date(anio, 7, 2);      // 2 agosto
  
  const tocaSemana1 = inicio <= recesoSemana1Fin && fin >= recesoSemana1Inicio;
  const tocaSemana2 = inicio <= recesoSemana2Fin && fin >= recesoSemana2Inicio;
  
  if (tocaSemana1 && tocaSemana2) {
    return {
      valid: false,
      message: "Solo puedes tomar una semana del receso invernal (20/7-2/8). " +
        "Si deseas 14 dias, combina una semana previa con la primera semana del receso, " +
        "o la segunda semana del receso con una semana posterior."
    };
  }
  
  return { valid: true, message: '' };
};
```

No se requieren cambios en base de datos. Las reglas se aplican exclusivamente en el frontend al momento de crear la solicitud.
