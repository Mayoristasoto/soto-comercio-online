

## Plan: Mover switch GPS a la tab Kioscos

### Problema
El switch "GPS Obligatorio para PIN" se agregó dentro de `FacialRecognitionConfig.tsx` (tab "Reconocimiento"), pero debería estar visible en la tab "Kioscos" donde el usuario lo busca.

### Solución
Extraer la sección "Configuración del Kiosco" (switches de impresión automática, llegada tarde, GPS obligatorio) del componente de reconocimiento facial y moverla a la tab "Kioscos" en `ConfiguracionAdmin.tsx` como un nuevo componente independiente.

### Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/ConfiguracionAdmin.tsx` | Importar y renderizar `FacialRecognitionConfig` (o un nuevo componente `KioskSettingsConfig`) dentro de la tab "kiosk", debajo de `KioskAlertConfig` y `KioskDeviceManagement` |
| `src/components/admin/FacialRecognitionConfig.tsx` | Remover la sección "Configuración del Kiosco" (3 switches: auto-print, llegada tarde, GPS) para evitar duplicación |

### Alternativa más limpia
Crear un componente `KioskSettingsConfig.tsx` que solo tenga los 3 switches de kiosco (auto-print tareas, alerta llegada tarde, GPS obligatorio PIN), usando `useFacialConfig` para leer/guardar. Esto mantiene separación de responsabilidades: reconocimiento facial en su tab, configuración operativa de kiosco en la suya.

