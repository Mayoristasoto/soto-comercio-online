# Tests para Timeline Utils

## Tests Unitarios (Jest + React Testing Library)

### Detección de Solapamientos

```typescript
describe('detectOverlaps', () => {
  test('detecta turnos solapados', () => {
    const shifts = [
      { id: '1', employee_id: 'emp1', start_time: '08:00', end_time: '16:00', duration: '8:00' },
      { id: '2', employee_id: 'emp1', start_time: '14:00', end_time: '22:00', duration: '8:00' }
    ];
    const overlaps = detectOverlaps(shifts);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].overlapMinutes).toBe(120); // 2 horas
  });

  test('no detecta turnos consecutivos como solapados', () => {
    const shifts = [
      { id: '1', employee_id: 'emp1', start_time: '08:00', end_time: '16:00', duration: '8:00' },
      { id: '2', employee_id: 'emp1', start_time: '16:00', end_time: '22:00', duration: '6:00' }
    ];
    const overlaps = detectOverlaps(shifts);
    expect(overlaps).toHaveLength(0);
  });

  test('maneja turnos nocturnos que cruzan medianoche', () => {
    const shifts = [
      { id: '1', employee_id: 'emp1', start_time: '22:00', end_time: '06:00', duration: '8:00' },
      { id: '2', employee_id: 'emp1', start_time: '00:00', end_time: '08:00', duration: '8:00' }
    ];
    const overlaps = detectOverlaps(shifts);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].overlapMinutes).toBeGreaterThan(0);
  });
});
```

### Generación de Colores

```typescript
describe('hashStringToColor', () => {
  test('genera colores consistentes para el mismo string', () => {
    const color1 = hashStringToColor('test-id-123');
    const color2 = hashStringToColor('test-id-123');
    expect(color1).toBe(color2);
  });

  test('genera colores diferentes para strings diferentes', () => {
    const color1 = hashStringToColor('test-id-1');
    const color2 = hashStringToColor('test-id-2');
    expect(color1).not.toBe(color2);
  });

  test('retorna formato HSL válido', () => {
    const color = hashStringToColor('test');
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });
});
```

## Test E2E Mínimo

### Escenario: Visualizar Timeline Diario

```typescript
describe('TimelineView E2E', () => {
  test('renderiza timeline con empleados y turnos', async () => {
    // Arrange
    render(<TimelineView date="2024-01-15" from="08:00" to="20:00" />);
    
    // Act
    await waitFor(() => {
      expect(screen.queryByText('Cargando timeline...')).not.toBeInTheDocument();
    });
    
    // Assert
    expect(screen.getByText(/empleados/i)).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  test('muestra detalles del turno al hacer click', async () => {
    const user = userEvent.setup();
    render(<TimelineView date="2024-01-15" from="08:00" to="20:00" />);
    
    await waitFor(() => {
      expect(screen.queryByText('Cargando timeline...')).not.toBeInTheDocument();
    });
    
    const shiftBlock = screen.getAllByRole('button')[0];
    await user.click(shiftBlock);
    
    expect(screen.getByText('Detalles del Turno')).toBeInTheDocument();
  });

  test('navega entre días correctamente', async () => {
    const user = userEvent.setup();
    render(<TimelineView />);
    
    const nextButton = screen.getByLabelText(/siguiente/i);
    await user.click(nextButton);
    
    // Verify date changed
    expect(screen.getByRole('heading')).toHaveTextContent(/\d{1,2} de \w+/);
  });
});
```

## Instrucciones de Ejecución

```bash
# Instalar dependencias de testing (si no están)
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Ejecutar tests unitarios
npm test timelineUtils

# Ejecutar tests E2E
npm test TimelineView.test
```
