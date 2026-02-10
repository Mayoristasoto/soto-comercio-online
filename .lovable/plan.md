

# Eliminar pestaña PIN del login y mantener PIN solo para kiosco

## Resumen

Se eliminara la pestaña "PIN" de la pantalla de login (`/auth` - `UnifiedAuth.tsx`). El acceso por primera vez seguira funcionando via el fallback automatico: el empleado ingresa su email y los 4 digitos del DNI como contraseña en la pestaña "Email", y el sistema detecta que es un PIN y lo procesa. El componente `PinLoginAuth` y la edge function `pin-first-login` se mantienen ya que el fallback los usa internamente.

## Cambios

**Archivo: `src/pages/UnifiedAuth.tsx`**

1. Eliminar la pestaña "PIN" del `TabsList` (linea 362-365): cambiar de `grid-cols-3` a `grid-cols-2` y remover el `TabsTrigger` de PIN.

2. Eliminar el `TabsContent value="pin"` (lineas 462-464) que renderiza `PinLoginAuth`.

3. Remover el import de `PinLoginAuth` (linea 12) y el icono `KeyRound` (linea 10) si no se usan en otro lugar.

## Que se mantiene

- El **fallback automatico** en la pestaña Email (lineas 86-124): si el password es de 4 digitos y falla la autenticacion normal, se intenta el flujo PIN via `pin-first-login`. Esto permite el primer acceso sin pestaña dedicada.
- La **edge function** `pin-first-login` sigue activa para ese fallback.
- El **PIN en kiosco** no se toca (usa `FicheroPinAuth` y `kiosk_verificar_pin`).
- El texto indicativo "Primera vez? Usa los 4 ultimos digitos de tu DNI" (linea 443) se mantiene visible.

## Detalle tecnico

```
TabsList: grid-cols-3 --> grid-cols-2
Tabs:     [Email] [PIN] [Facial]  -->  [Email] [Facial]
```

No se requieren cambios en base de datos ni en edge functions.
