

## Plan: Condicionar alerta de Cruces Rojas en el kiosco

### Lógica solicitada

La alerta de **Cruces Rojas** en el kiosco actualmente se muestra siempre que haya al menos 1 cruz roja en la semana. Se cambiará a:

1. **Mostrar inmediatamente** solo si el empleado tiene **2+ llegadas tarde** O **2+ pausas excedidas** en la semana actual
2. **Si tiene cruces pero no llega al umbral de 2**, mostrar la alerta **solo los sábados** (día 6) cuando el empleado ficha salida (fin de jornada), para no generar malestar durante la semana
3. Las alertas individuales de **Llegada Tarde**, **Pausa Excedida** y **Novedades** siguen funcionando normalmente sin cambios

### Archivo a modificar

**`src/pages/KioscoCheckIn.tsx`** — Sección de verificación de cruces rojas (~líneas 707-731)

### Cambio

Reemplazar la condición actual:
```
if (crucesData.total_cruces_rojas > 0) → mostrar alerta
```

Por la nueva lógica:
```typescript
const llegadasTarde = crucesData.llegadas_tarde || 0
const pausasExcedidas = crucesData.pausas_excedidas || 0
const hoy = new Date()
const esSabado = hoy.getDay() === 6

// Determinar la acción actual (salida = fin de jornada)
const esFinJornada = acciones.some(a => a.tipo === 'salida')

const debeAlertarInmediato = llegadasTarde >= 2 || pausasExcedidas >= 2
const debeAlertarSabado = esSabado && esFinJornada && crucesData.total_cruces_rojas > 0

if (debeAlertarInmediato || debeAlertarSabado) {
  setCrucesRojas(crucesData)
  setShowCrucesRojasAlert(true)
  setShowFacialAuth(false)
  return
}
```

### Resumen

| Condición | Comportamiento |
|-----------|---------------|
| 2+ llegadas tarde en la semana | Mostrar alerta inmediatamente (cualquier día) |
| 2+ pausas excedidas en la semana | Mostrar alerta inmediatamente (cualquier día) |
| Tiene cruces pero < 2 de cada tipo | Solo mostrar el sábado al fichar salida |
| Llegada Tarde individual | Sigue mostrándose normalmente |
| Pausa Excedida individual | Sigue mostrándose normalmente |
| Novedades | Sigue mostrándose normalmente |

