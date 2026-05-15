Voy a corregir el cálculo para que los minutos antes de la entrada de referencia nunca generen ni aumenten horas extra.

Plan:
1. En `src/utils/reporteHorasExtrasPDF.ts`, cambiar la lógica de `calcularJornadas` para calcular el exceso así:
   - Mantener la entrada real solo como dato mostrado.
   - Usar la hora de entrada de referencia (`09:00` por defecto) para construir la salida esperada: referencia + jornada base.
   - Calcular `excesoRealMin` únicamente como `salida real - salida esperada`.
   - Si salió antes o justo a la hora esperada, el exceso será `0`.
2. Mantener el redondeo actual:
   - 0 a 18 min -> 0
   - 19 a 44 min -> 30 min
   - 45 a 59 min -> 1 h
3. Ajustar `brutasHs` para que siga representando horas computables desde la entrada efectiva, pero sin usar sus minutos previos para inflar el exceso.
4. Agregar un caso de validación rápido con el ejemplo reportado:
   - Entrada 09:54, salida 18:18, base 8h -> salida esperada 17:00, exceso real 78 min, pagado 1h 30m.
   - Entrada 08:56, salida 17:19, base 8h -> salida esperada 17:00, exceso real 19 min, pagado 30 min.

Resultado esperado: el reporte mostrará solamente los minutos excedidos en la salida, sin sumar minutos anteriores o diferencias de entrada.