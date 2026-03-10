# Conflictive Reports - Notes

## conflictive-report-1.jpeg

1. **Separador de miles no reconocido**: El AI no interpretaba correctamente el formato numérico argentino (punto como separador de miles, coma como decimal). **Fix**: Se ajustó el prompting indicando cómo funcionan los números en Argentina.
2. **Cemento: cantidad y subtotal no reconocidos**: No se identificaron las unidades ni el total de uno de los ítems (cemento). **Pendiente**: Mejorar el reconocimiento de cantidad y subtotal por ítem.
3. **La suma de ítems no coincide con el total**: El total del comprobante no coincide con la suma de los ítems individuales. **Pendiente**: Alertar esta discrepancia tanto con AI (en el prompting) como programáticamente.
