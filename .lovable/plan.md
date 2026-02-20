
# Unificar asignación de documentos obligatorios por puesto

## Diagnóstico del estado actual

Hay dos sistemas paralelos desconectados:

1. **`documentos_obligatorios` + `asignaciones_documentos_obligatorios`**: para documentos globales (Reglamento Interno). La asignación es manual, empleado por empleado, sin relación con el puesto.

2. **`puesto_documentos`**: manuales por puesto cargados en PuestoManagement. Estos NO se asignan automáticamente a los empleados como documentos obligatorios a firmar.

El usuario quiere un flujo unificado donde:
- El **Reglamento Interno** se asigne a todos los empleados (o a los nuevos) con un solo click
- Cada **Manual de Puesto** se asigne automáticamente a los empleados de ese puesto
- Todo se gestione desde un solo lugar

## Solución: nuevo componente "Gestión de Documentos Obligatorios"

Se crea un componente unificado `GestionDocumentosObligatorios` que reemplaza los dos tabs actuales (`mandatory-docs` y `assignments`) con una experiencia centralizada de 3 secciones en tabs internos:

### Tab 1 - Documentos (catálogo)
Lista de todos los documentos en `documentos_obligatorios`, con botón para crear/editar y tipo. Sin cambios aquí.

### Tab 2 - Reglas de asignación por puesto (NUEVO)
Una tabla que muestra cada puesto activo y qué documentos obligatorios tiene asignados como regla automática. Se soporta mediante una nueva tabla `documento_puesto_reglas`:

```text
documento_puesto_reglas
  id          uuid PK
  documento_id uuid FK → documentos_obligatorios
  puesto_id    uuid FK → puestos (nullable = aplica a todos)
  created_at   timestamp
```

Si `puesto_id` es NULL = el documento aplica a **todos** los puestos (Reglamento Interno).
Si `puesto_id` tiene valor = aplica solo a ese puesto (Manual de Cajero, etc.).

### Tab 3 - Asignaciones individuales
El `DocumentAssignments` actual mejorado, que además muestra si la asignación vino de una regla automática.

### Acción clave: "Asignar según reglas"
Un botón que ejecuta la lógica:
1. Lee todas las reglas en `documento_puesto_reglas`
2. Para cada empleado activo, busca qué documentos le corresponden (su puesto + los globales)
3. Crea los registros en `asignaciones_documentos_obligatorios` que falten (sin duplicar)
4. También activa el flag `debe_firmar_documentos_iniciales = true` en los empleados afectados

## Cambios en la base de datos

### Migración: nueva tabla `documento_puesto_reglas`

```sql
CREATE TABLE documento_puesto_reglas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id uuid NOT NULL REFERENCES documentos_obligatorios(id) ON DELETE CASCADE,
  puesto_id uuid REFERENCES puestos(id) ON DELETE CASCADE, -- NULL = todos los puestos
  created_at timestamp with time zone DEFAULT now()
);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX ON documento_puesto_reglas(documento_id, puesto_id) WHERE puesto_id IS NOT NULL;
CREATE UNIQUE INDEX ON documento_puesto_reglas(documento_id) WHERE puesto_id IS NULL;

ALTER TABLE documento_puesto_reglas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_rrhh puede gestionar reglas" ON documento_puesto_reglas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empleados e WHERE e.user_id = auth.uid() AND e.rol = 'admin_rrhh'
    )
  );
```

## Archivos a crear/modificar

### Nuevo archivo: `src/components/admin/GestionDocumentosObligatorios.tsx`

Componente principal unificado con 3 tabs:

**Tab "Documentos"**: Reusa `MandatoryDocuments` internamente.

**Tab "Reglas por Puesto"** (nueva lógica principal):
- Una fila por puesto activo + una fila especial "Todos los puestos"
- Columnas: Puesto | Documentos asignados | Acción agregar
- Permite con un select agregar/quitar documentos de la regla por puesto
- Muestra cuántos empleados tiene ese puesto
- Botón global **"Aplicar reglas a empleados"** que llama a la función de asignación masiva

**Tab "Estado de asignaciones"**: Reusa `DocumentAssignments` internamente.

### Modificación: `src/pages/Nomina.tsx`

Reemplazar los dos tabs `mandatory-docs` y `assignments` por un solo tab `doc-obligatorios` que carga `GestionDocumentosObligatorios`.

## Flujo de trabajo resultante

```text
Admin entra a Nómina → tab "Doc. Obligatorios"
  ├── Tab "Documentos": crea/edita documentos (Reglamento, manuales, etc.)
  ├── Tab "Reglas por Puesto":
  │     ├── Fila "Todos los puestos" → asigna Reglamento Interno aquí
  │     ├── Fila "Cajero" → asigna Manual de Cajero aquí
  │     ├── Fila "Vendedor" → asigna Manual de Vendedor aquí
  │     └── [Botón] "Aplicar reglas" → genera asignaciones individuales
  └── Tab "Asignaciones": ve el estado por empleado (firmado/pendiente)
```

## Detalle técnico: lógica "Aplicar reglas"

```typescript
// Pseudocódigo de la función masiva
const aplicarReglas = async () => {
  // 1. Obtener todas las reglas
  const reglas = await supabase.from('documento_puesto_reglas').select('*')
  
  // 2. Obtener empleados activos con su puesto_id
  const empleados = await supabase.from('empleados')
    .select('id, puesto_id').eq('activo', true)
  
  // 3. Para cada empleado, calcular qué documentos le corresponden
  for (const emp of empleados) {
    const docsAplicables = reglas.filter(r => 
      r.puesto_id === null ||        // regla global
      r.puesto_id === emp.puesto_id  // regla de su puesto
    )
    
    // 4. Insertar asignaciones faltantes
    for (const regla of docsAplicables) {
      // upsert ignora duplicados con ON CONFLICT DO NOTHING
    }
    
    // 5. Activar flag de firma obligatoria
    if (docsAplicables.length > 0) {
      await supabase.from('empleados')
        .update({ debe_firmar_documentos_iniciales: true })
        .eq('id', emp.id)
    }
  }
}
```

## Sin impacto en el flujo del empleado

El componente `ForcedDocumentSigning` que ya existe seguirá funcionando sin cambios: sigue leyendo `asignaciones_documentos_obligatorios` como antes. La nueva tabla de reglas solo cambia cómo se generan esas asignaciones, no cómo se consumen.
