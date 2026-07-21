## Crear empleado Uriel Sanchez Gudelevich

Voy a dar de alta al empleado con los datos básicos disponibles. Los datos sensibles (DNI, CUIL, sexo, nacionalidad, fecha nac., etc.) se guardarán en la tabla protegida `empleados_datos_sensibles`.

### Datos a cargar

**En `empleados`** (datos generales):
- Nombre: Uriel
- Apellido: Sanchez Gudelevich
- Email: placeholder temporal (`uriel.sanchez@pendiente.local`) — lo actualizás cuando tengas el real
- Rol: `empleado`
- Activo: true
- Fecha ingreso: hoy (editable después)
- Sucursal: sin asignar (la definís después)

**En `empleados_datos_sensibles`**:
- DNI: 44043531
- CUIL: 23-44043531-9
- Sexo: Masculino
- Nacionalidad: Argentina
- Fecha nacimiento: 19/03/2002
- Fecha emisión DNI: 14/09/2025
- Fecha vencimiento DNI: 14/09/2040
- Ejemplar DNI: B
- Nº trámite: 7400849063751
- Fecha alta CUIL: 17/04/2006

### Notas
- Datos pendientes que podés completar después desde el perfil: email real, teléfono, dirección, puesto, salario, sucursal, fecha de ingreso, antigüedad reconocida, fecha prueba, contacto emergencia.
- Si algún campo (ej. "ejemplar DNI" o "fecha alta CUIL") no existe en el esquema actual de `empleados_datos_sensibles`, lo agrego con una migración antes del insert.
