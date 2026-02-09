

## Agregar formulario de Anotacion Rapida

### Que se va a hacer
Agregar una seccion de "Anotacion Rapida" en la pagina de Anotaciones, visible tanto para admin como gerente. Es un formulario minimalista: solo seleccionar empleado y escribir el texto. Se guarda automaticamente con categoria "otro" y el texto como titulo.

### Donde se ubica
- Para **admin**: se muestra como una Card arriba de los tabs existentes (siempre visible sin cambiar de tab)
- Para **gerente**: se muestra arriba del formulario completo actual

### Como funciona
1. El usuario selecciona un empleado del dropdown
2. Escribe el texto rapido en un input (ej: "se fue 10 min antes", "preguntarle sobre cliente")
3. Presiona Enter o el boton de guardar
4. Se inserta en `empleados_anotaciones` con:
   - `categoria`: "otro" (valor por defecto)
   - `titulo`: el texto ingresado
   - `descripcion`: null
   - `requiere_seguimiento`: false
   - `es_critica`: false

### Detalle tecnico

**Nuevo componente: `src/components/anotaciones/AnotacionRapida.tsx`**
- Props: `userInfo`, `isAdmin`, `isGerente`
- Carga lista de empleados (misma logica que NuevaAnotacion, filtrando por sucursal si es gerente)
- Formulario inline en una sola fila: Select de empleado + Input de texto + boton guardar
- El Input soporta envio con Enter
- Inserta en `empleados_anotaciones` con categoria fija "otro"
- Toast de confirmacion al guardar
- Limpia el input despues de guardar (mantiene el empleado seleccionado para anotar varias seguidas)
- Validacion: maximo 200 caracteres, campo no vacio

**Modificacion: `src/pages/Anotaciones.tsx`**
- Importar `AnotacionRapida`
- Para admin: agregar la Card de anotacion rapida entre el titulo de la pagina y los Tabs
- Para gerente: agregar la Card arriba del formulario completo existente

### Diseno visual
- Card compacta con icono de rayo (Zap de lucide)
- Titulo: "Anotacion Rapida"
- Layout horizontal: dropdown de empleado (40% ancho) + input de texto (50%) + boton icono (10%)
- En mobile se apila verticalmente
