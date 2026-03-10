# Conflictive Reports - Notes

## conflictive-report-1.jpeg

1. **Separador de miles no reconocido**: El AI no interpretaba correctamente el formato numérico argentino (punto como separador de miles, coma como decimal). **Fix**: Se ajustó el prompting indicando cómo funcionan los números en Argentina.
2. **Cemento: cantidad y subtotal no reconocidos**: No se identificaron las unidades ni el total de uno de los ítems (cemento). **Fix**: El prompt ahora indica usar siempre el subtotal (cantidad x precio unitario) como `amount`, e incluir la cantidad en el nombre del ítem (ej: "Bolsa Cemento 25kg Holcim | x10 u").
3. **La suma de ítems no coincide con el total**: El total del comprobante no coincide con la suma de los ítems individuales. **Fix**: Se agregó validación programática que compara la suma de ítems con el total y muestra una advertencia en el mensaje de confirmación si hay discrepancia.
4. **"PAGADO" en el comprobante interpretado como pagado por el cliente**: El sello "PAGADO" del comercio hacía que el AI marcara `installmentPercent: 100`. **Fix**: El prompt ahora indica explícitamente ignorar textos como "PAGADO", "CANCELADO", "ABONADO" en la imagen — solo el texto del usuario determina el estado de pago.
