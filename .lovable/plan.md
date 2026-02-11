

# Pagina de Instructivo Interactivo para Empleados

## Resumen

Se creara una nueva pagina dedicada `/instructivo` donde los empleados pueden consultar la guia del sistema de forma interactiva, con capturas de pantalla cargadas desde la base de datos (`instructivo_screenshots`). La pagina sera independiente y accesible desde el menu lateral, reutilizando el contenido existente del componente `EmpleadoInstructivo` pero presentado en un formato de pagina completa con imagenes integradas en cada seccion.

## Cambios

### 1. Nueva pagina `src/pages/Instructivo.tsx`

Pagina contenedora simple que renderiza el componente de instructivo interactivo dentro del layout estandar con titulo y descripcion.

### 2. Modificar `src/components/employee/EmpleadoInstructivo.tsx`

Integrar las capturas de pantalla del storage (`instructivo_screenshots`) dentro de cada seccion del accordion:

- Ya existe la logica de carga de screenshots (`loadScreenshots`) que mapea `seccion -> imagen_url`
- Se mostrara la imagen correspondiente dentro de cada `AccordionContent`, debajo del texto explicativo
- Si no hay screenshot para una seccion, no se muestra imagen (comportamiento actual)
- Las imagenes se mostraran con bordes redondeados, sombra suave y un label "Vista previa" para darle contexto visual
- Se usara un componente `AspectRatio` para mantener proporciones consistentes

### 3. Agregar ruta en `src/App.tsx`

Agregar la ruta `/instructivo` dentro del bloque de `UnifiedLayout` para que sea accesible con el sidebar y header del sistema:

```
<Route path="instructivo" element={<Instructivo />} />
```

## Detalle tecnico

**Mapeo de secciones a screenshots:**

El componente ya carga los screenshots de la tabla `instructivo_screenshots` y los guarda en un `Record<string, string>` donde la key es la columna `seccion`. Cada `AccordionItem` tiene un `value` (ej: `"login"`, `"dashboard"`, `"tareas"`). Se usara este value para buscar el screenshot correspondiente:

```typescript
// Dentro de cada AccordionContent, al final:
{screenshots['login'] && (
  <div className="mt-4 border rounded-lg overflow-hidden shadow-sm">
    <p className="text-xs text-muted-foreground px-3 py-1 bg-muted">Vista previa</p>
    <img src={screenshots['login']} alt="Screenshot login" className="w-full" />
  </div>
)}
```

Se aplicara este patron a todas las secciones del accordion: `login`, `dashboard`, `tareas`, `capacitaciones`, `documentos`, `fichaje`, `reconocimientos`, `calificaciones`, `entregas`, `eventos`, `vacaciones`, `navegacion`, `seguridad`, `cerrar-sesion`.

**Archivos modificados:**
1. `src/pages/Instructivo.tsx` (nuevo) - pagina contenedora
2. `src/components/employee/EmpleadoInstructivo.tsx` - agregar imagenes en cada seccion
3. `src/App.tsx` - agregar ruta `/instructivo`

No se requieren cambios en base de datos. Las imagenes se gestionan desde el panel admin existente (`/admin/instructivo-screenshots`).
