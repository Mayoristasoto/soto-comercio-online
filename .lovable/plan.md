
# Restriccion de Autogestion: solo autenticacion facial

## Contexto

El kiosco tiene un estado `modoAutenticacion` que ya distingue entre `'facial'` y `'pin'`. El acceso a la pagina `/autogestion` (tareas, adelantos, saldo) ocurre en 3 puntos dentro de `KioscoCheckIn.tsx` y en ambos componentes de alerta. La solucion es bloquear esos 3 puntos cuando `modoAutenticacion === 'pin'`.

## Puntos a modificar

### 1. Boton "Otras Consultas" en la pantalla de seleccion de accion

`src/pages/KioscoCheckIn.tsx` lineas 2560-2569

Actualmente siempre visible. Se agrega condicion para que solo se muestre si `modoAutenticacion === 'facial'`.

Si el modo es PIN, en su lugar se muestra un mensaje informativo que indica que las consultas de autogestion requieren autenticacion facial.

### 2. TareasPendientesAlert — boton "Ver Todas Mis Tareas"

`src/components/kiosko/TareasPendientesAlert.tsx`

Se agrega la prop opcional `mostrarBotonAutoGestion?: boolean` (default `true`). Cuando sea `false`, el boton "Ver Todas Mis Tareas" se oculta.

En `KioscoCheckIn.tsx` linea 2219-2234, se pasa `mostrarBotonAutoGestion={modoAutenticacion === 'facial'}`.

### 3. TareasVencenHoyAlert — boton "Ver en Autogestion"

`src/components/kiosko/TareasVencenHoyAlert.tsx`

Ya es opcional (`onVerAutoGestion?`): si no se pasa, el boton no se renderiza (linea 126-130 del componente). Solo hay que dejar de pasar la prop cuando el modo es PIN.

En `KioscoCheckIn.tsx` linea 2248-2252, se condiciona: `onVerAutoGestion={modoAutenticacion === 'facial' ? () => { ... } : undefined}`.

## Detalle tecnico

### Archivos a modificar

```text
src/pages/KioscoCheckIn.tsx          - 3 cambios (boton + 2 props condicionales)
src/components/kiosko/TareasPendientesAlert.tsx  - 1 cambio (nueva prop opcional)
```

### Logica central

```text
modoAutenticacion === 'facial'  →  acceso a /autogestion habilitado
modoAutenticacion === 'pin'     →  boton ocultado / mensaje informativo
```

### Cambio en TareasPendientesAlert

Se agrega prop `mostrarBotonAutoGestion?: boolean` (default `true`). El boton "Ver Todas Mis Tareas" se envuelve en `{mostrarBotonAutoGestion !== false && (...)}`.

### Mensaje informativo para PIN

Cuando el modo es PIN, en lugar del boton "Otras Consultas" se muestra un texto discreto:

> "Para acceder a consultas personales, inicia sesion con reconocimiento facial"

Esto orienta al empleado sin generar confusion.

## Sin cambios en la base de datos

No se requieren migraciones ni cambios en el backend. Es una restriccion puramente visual/de navegacion en el frontend.

## Flujo resultante

```text
Autenticacion facial  →  ve "Otras Consultas" + botones de autogestion en alertas
Autenticacion PIN     →  NO ve "Otras Consultas" + alertas sin boton de autogestion
                         (mensaje informativo reemplaza el boton)
```
