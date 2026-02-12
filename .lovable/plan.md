

# Completar DNI de Julio Navarrete y probar kiosco

## Cambios necesarios

### 1. Actualizar DNI en la tabla `empleados`
- Ejecutar un UPDATE en la tabla `empleados` para establecer `dni = '26769221'` para Julio Gomez Navarrete (id: `1607f6ba-046c-466d-8b4d-acc18e2acfa4`).

### 2. Probar check-in en kiosco
- Navegar a `/kiosco`
- Ingresar PIN **9221** (ultimos 4 digitos del DNI)
- Verificar que aparece la alerta de tareas pendientes correctamente, sin mostrar "Fecha limite" para las tareas de frecuencia semanal flexible

## Detalle tecnico

| Accion | Detalle |
|--------|---------|
| Tabla | `empleados` |
| Campo | `dni` |
| Valor | `26769221` |
| Empleado ID | `1607f6ba-046c-466d-8b4d-acc18e2acfa4` |
| PIN esperado | `9221` |

No se requieren cambios de esquema ni migraciones, solo una actualizacion de datos.

