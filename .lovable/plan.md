

## Análisis del PDF F931 subido

### Situación
El PDF subido es la **carátula/resumen** del F931 de febrero 2026 con datos globales:
- 20 empleados en nómina
- Suma Rem. 1: $20.687.994,74
- Aportes SS: $2.586.585,65
- Contribuciones SS: $3.384.412,39
- Aportes OS: $624.842,65
- Contribuciones OS: $1.247.985,30
- LRT: $1.005.686,65

**No contiene el desglose individual por empleado** (CUIL, nombre, remuneración de cada uno). El OCR actual del importador está diseñado para extraer filas individuales por empleado.

### Opciones

**Opción A**: Usar este PDF para importar los **totales como registro de resumen** del período en la tabla `importacion_f931` (un solo registro con los montos globales para validación cruzada).

**Opción B**: No importar este PDF ya que no tiene detalle individual. Necesitarías exportar desde AFIP el **detalle de la DDJJ** que lista cada CUIL con su remuneración y aportes individuales.

**Opción C**: Importar estos totales como datos de referencia en una nueva columna/tabla de `periodos_contables` para poder comparar los totales declarados contra los calculados internamente.

### Recomendación
La **Opción C** es la más útil: guardar los totales del F931 en el período contable para que el dashboard de rentabilidad pueda mostrar una comparación "Declarado en AFIP vs. Calculado internamente" y detectar diferencias.

No se requieren cambios de código si solo querés probar el OCR — pero este PDF no va a generar filas individuales por empleado ya que no las contiene.

