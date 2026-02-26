

## Plan: Configurable Kiosk Alert System — IMPLEMENTED ✅

### What was done
1. ✅ Inserted 10 config keys in `facial_recognition_config` (durations, enabled flags, order JSON)
2. ✅ Extended `useFacialConfig` hook with all kiosk alert fields
3. ✅ Created `KioskAlertConfig.tsx` — rich config panel with reorderable list, toggles, duration inputs, flow preview
4. ✅ Added `KioskAlertConfig` to ConfiguracionAdmin "Kioscos" tab
5. ✅ Wired dynamic `duracionSegundos` from config into all alert components in KioscoCheckIn.tsx
6. ✅ Changed NovedadesCheckInAlert default to 5s
