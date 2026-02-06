

## Agregar advertencia de apercibimiento en PausaExcedidaAlert

### Cambio
Agregar el mismo bloque de advertencia amarillo que ya existe en `LlegadaTardeAlert` al componente `PausaExcedidaAlert`, ubicado entre la tarjeta de incidencia y el countdown.

### Detalle tecnico

**Archivo: `src/components/kiosko/PausaExcedidaAlert.tsx`**

Insertar despues del cierre de la Card de incidencia (linea 112) y antes del div del countdown (linea 114), el siguiente bloque:

```tsx
{/* Warning de apercibimiento */}
<div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-6 text-center animate-pulse">
  <p className="text-sm sm:text-base md:text-lg font-bold text-yellow-400">
    ⚠️ En caso de repetirse, será apercibido/a.
  </p>
</div>
```

Es identico al bloque ya implementado en `LlegadaTardeAlert` para mantener consistencia visual.

