

## Diagnóstico

**Problema**: El kiosco muestra `late_arrival_alert_enabled: false` aunque en la base de datos está en `true` porque:
1. El kiosco opera en sesión anónima (sin login)
2. RLS bloquea lectura de `facial_recognition_config` para rol `anon`
3. El hook `useFacialConfig` cae al default: `lateArrivalAlertEnabled: false`

**Evidencia**:
- BD: `late_arrival_alert_enabled = true`
- Console kiosco: `loading: false, valor: false`

---

## Solución

Crear un RPC `kiosk_get_alert_config` con `SECURITY DEFINER` que retorne la configuración de alertas, accesible desde sesión anónima.

---

## Cambios a implementar

### A) Nueva migración SQL

```sql
CREATE OR REPLACE FUNCTION public.kiosk_get_alert_config()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_late_arrival BOOLEAN;
  v_pause_exceeded BOOLEAN;
BEGIN
  SELECT 
    COALESCE(
      CASE LOWER(value) 
        WHEN 'true' THEN true 
        WHEN '1' THEN true 
        WHEN 'yes' THEN true 
        ELSE false 
      END, 
      false
    ) INTO v_late_arrival
  FROM facial_recognition_config 
  WHERE key = 'late_arrival_alert_enabled';
  
  SELECT 
    COALESCE(
      CASE LOWER(value) 
        WHEN 'true' THEN true 
        WHEN '1' THEN true 
        WHEN 'yes' THEN true 
        ELSE false 
      END, 
      true  -- default true para pausa excedida
    ) INTO v_pause_exceeded
  FROM facial_recognition_config 
  WHERE key = 'pause_exceeded_alert_enabled';
  
  RETURN json_build_object(
    'late_arrival_enabled', COALESCE(v_late_arrival, false),
    'pause_exceeded_enabled', COALESCE(v_pause_exceeded, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_alert_config() TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_alert_config() TO authenticated;
```

### B) Actualizar KioscoCheckIn.tsx

Reemplazar el uso de `useFacialConfig()` por una llamada directa al nuevo RPC para obtener configuración de alertas:

```typescript
// Nuevo estado para config de alertas
const [alertConfig, setAlertConfig] = useState({ 
  lateArrivalEnabled: true,   // default true mientras carga
  pauseExceededEnabled: true 
});
const [alertConfigLoading, setAlertConfigLoading] = useState(true);

// Cargar config de alertas via RPC
useEffect(() => {
  const cargarAlertConfig = async () => {
    try {
      const { data, error } = await supabase.rpc('kiosk_get_alert_config');
      if (!error && data) {
        setAlertConfig({
          lateArrivalEnabled: data.late_arrival_enabled ?? true,
          pauseExceededEnabled: data.pause_exceeded_enabled ?? true
        });
      }
    } finally {
      setAlertConfigLoading(false);
    }
  };
  cargarAlertConfig();
}, []);
```

Luego usar `alertConfig.lateArrivalEnabled` en lugar de `facialConfig.lateArrivalAlertEnabled`.

---

## Archivos a modificar

1. **Nueva migración SQL** - crear RPC `kiosk_get_alert_config`
2. **src/pages/KioscoCheckIn.tsx** - usar el nuevo RPC en lugar de `useFacialConfig` para alertas

---

## Resultado esperado

- El kiosco obtendrá correctamente `late_arrival_enabled: true` desde la BD
- Las alertas de llegada tarde se activarán correctamente
- Se registrarán las cruces rojas de llegada tarde cuando corresponda

