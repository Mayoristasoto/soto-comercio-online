# Diagnóstico — Por qué no pudo fichar Washintong

## Resultado de la investigación

Washintong Celindo Bartolo Loyola (legajo 1) **no tiene ningún intento de fichaje registrado hoy** (24/06/2026):

- 0 fichajes en `fichajes`
- 0 eventos en `facial_recognition_logs`
- 0 llamadas en `api_logs`
- 0 incidencias en `fichaje_incidencias`
- Sin rate limit activo
- Empleado activo, con turno asignado y 2 rostros válidos (confianza 0.89 y 0.91)
- Último fichaje OK: ayer 23/06 (entrada 10:19, salida 18:23 UTC)

## Causa raíz probable

Pertenece a la sucursal **Olazar 26**. Revisando el resto de empleados de esa sucursal:

| Empleado | Fichajes hoy |
|---|---|
| Washintong Celindo Bartolo Loyola | 0 |
| Juan Domingo Martinez | 0 |

**Nadie de Olazar 26 fichó hoy.** En el resto de sucursales sí hubo actividad normal (José Martí 6, Juan B. Justo 4, Ventas 1, Administración 1).

Conclusión: el problema **no es del empleado ni del sistema**, sino del **dispositivo kiosco de la sucursal Olazar 26**, que no envió ninguna request hoy.

## Acciones sugeridas (a confirmar con el usuario)

1. **Verificar físicamente** el kiosco de Olazar 26:
   - Equipo encendido
   - Conexión a internet
   - Navegador abierto en la URL del kiosco
   - Cámara funcionando
   - Token de dispositivo válido (revisar `kiosk_devices` para esa sucursal)
2. Una vez restablecido, decidir si:
   - Se cargan **fichajes manuales** para Washintong y Juan Domingo del día de hoy, o
   - Se generan **incidencias** (`fichaje_incidencias`) para que los empleados/gerente las justifiquen desde Autogestión.

## Próximo paso

Confirmar con el usuario qué acción tomar (revisar dispositivo, cargar fichaje manual masivo para la sucursal, o generar incidencias).
