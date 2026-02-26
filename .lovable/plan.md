

## Plan: Configurable Kiosk Alert System

### Current State
The kiosk has 6 alerts with hardcoded durations and a fixed execution order:
1. **Llegada Tarde** -- default 2s
2. **Cruces Rojas** -- default 2s
3. **Pausa Excedida** -- default 2s (was 3s)
4. **Novedades** -- default 15s
5. **Tareas Pendientes** -- default 10s (component default 8s)
6. **Tareas Vencen Hoy** (gerentes only) -- no countdown

All durations are hardcoded in the component defaults and in KioscoCheckIn.tsx props. The order is hardcoded in the `ejecutarAccionDirecta` function logic.

### Changes

#### Step 1: Add new config keys to `facial_recognition_config` table
Insert rows for each alert's duration and enable/disable + a JSON key for alert order:

```sql
INSERT INTO facial_recognition_config (key, value, description, data_type) VALUES
  ('kiosk_alert_llegada_tarde_seconds', '2', 'Duración alerta llegada tarde (seg)', 'number'),
  ('kiosk_alert_cruces_rojas_seconds', '2', 'Duración alerta cruces rojas (seg)', 'number'),
  ('kiosk_alert_pausa_excedida_seconds', '2', 'Duración alerta pausa excedida (seg)', 'number'),
  ('kiosk_alert_novedades_seconds', '5', 'Duración alerta novedades (seg)', 'number'),
  ('kiosk_alert_tareas_seconds', '10', 'Duración alerta tareas pendientes (seg)', 'number'),
  ('kiosk_alert_cruces_rojas_enabled', 'true', 'Habilitar alerta cruces rojas', 'boolean'),
  ('kiosk_alert_pausa_excedida_enabled', 'true', 'Habilitar alerta pausa excedida', 'boolean'),
  ('kiosk_alert_novedades_enabled', 'true', 'Habilitar alerta novedades', 'boolean'),
  ('kiosk_alert_tareas_enabled', 'true', 'Habilitar alerta tareas pendientes', 'boolean'),
  ('kiosk_alert_order', '["llegada_tarde","cruces_rojas","pausa_excedida","novedades","tareas_pendientes"]', 'Orden de alertas del kiosco', 'json')
ON CONFLICT (key) DO NOTHING;
```

#### Step 2: Extend `useFacialConfig` hook
Add new fields to the `FacialConfig` interface and parsing logic:
- `kioskAlertLlegadaTardeSeconds` (number)
- `kioskAlertCrucesRojasSeconds` (number)
- `kioskAlertPausaExcedidaSeconds` (number)
- `kioskAlertNovedadesSeconds` (number)
- `kioskAlertTareasSeconds` (number)
- `kioskAlertCrucesRojasEnabled` (boolean)
- `kioskAlertPausaExcedidaEnabled` (boolean)
- `kioskAlertNovedadesEnabled` (boolean)
- `kioskAlertTareasEnabled` (boolean)
- `kioskAlertOrder` (string[])

Add corresponding DB key mappings in `updateConfig`.

#### Step 3: New component `KioskAlertConfig.tsx`
A rich configuration panel inside the "Kioscos" tab with:
- A **drag-reorderable list** (or up/down arrows) showing all 5 alert types with:
  - Icon + name + description
  - Enable/disable toggle
  - Duration input (seconds) with min/max validation
  - Current position number
- Visual preview of the alert chain flow
- Save/discard buttons

#### Step 4: Add `KioskAlertConfig` to ConfiguracionAdmin
Inside the existing "kiosk" tab (`TabsContent value="kiosk"`), add the new `KioskAlertConfig` component alongside `KioskDeviceManagement`.

#### Step 5: Wire config into KioscoCheckIn.tsx
- Read alert durations and enabled flags from `useFacialConfig`
- Pass dynamic `duracionSegundos` to each alert component instead of hardcoded values
- Use the `kioskAlertOrder` array to determine which alert shows next when one dismisses (refactor the chaining logic into a queue-based approach)

#### Step 6: Change NovedadesCheckInAlert default to 5s
Update the default prop from 15 to 5 in `NovedadesCheckInAlert.tsx`.

### Files Modified
- `src/hooks/useFacialConfig.ts` -- extend config interface + parsing
- `src/components/admin/KioskAlertConfig.tsx` -- **new file**, alert configuration UI
- `src/pages/ConfiguracionAdmin.tsx` -- import and render KioskAlertConfig in kiosk tab
- `src/pages/KioscoCheckIn.tsx` -- use dynamic config for durations/order/enabled
- `src/components/kiosko/NovedadesCheckInAlert.tsx` -- change default to 5s
- **Migration** -- insert new config rows

