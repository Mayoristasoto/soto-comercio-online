import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, ChevronLeft, ChevronRight, Filter, Users } from 'lucide-react';
import { ShiftDetailModal } from './ShiftDetailModal';
import { useTimelineData } from '@/hooks/useTimelineData';
import { detectOverlaps, getShiftBlocks, hashStringToColor } from '@/lib/timelineUtils';
import { Shift, Employee, TimelineFilter } from '@/types/timeline';

interface TimelineViewProps {
  initialDate?: string;
  from?: string;
  to?: string;
  filters?: TimelineFilter;
}

export function TimelineView({ 
  initialDate, 
  from = '00:00', 
  to = '23:59',
  filters = {}
}: TimelineViewProps) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [draggedShift, setDraggedShift] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const { employees, shifts, loading, error, updateShift } = useTimelineData(date, from, to, filters);
  
  const [fromHour, fromMinute] = from.split(':').map(Number);
  const [toHour, toMinute] = to.split(':').map(Number);
  
  // Generate hour columns
  const totalMinutes = (toHour * 60 + toMinute) - (fromHour * 60 + fromMinute);
  const hourColumns = Math.ceil(totalMinutes / 60);
  const hours = Array.from({ length: hourColumns }, (_, i) => {
    const hour = fromHour + i;
    return hour < 24 ? hour : hour - 24;
  });

  const handlePrevDay = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    setDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    setDate(next.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleShiftDragStart = (shiftId: string) => {
    setDraggedShift(shiftId);
  };

  const handleShiftDrop = useCallback((employeeId: string, newStartTime: string) => {
    if (!draggedShift) return;
    
    updateShift(draggedShift, { start_time: newStartTime });
    setDraggedShift(null);
  }, [draggedShift, updateShift]);

  const calculateTotalHours = (employeeShifts: Shift[]) => {
    return employeeShifts.reduce((total, shift) => {
      const start = new Date(`2000-01-01T${shift.start_time}`);
      const end = new Date(`2000-01-01T${shift.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + (hours > 0 ? hours : hours + 24);
    }, 0);
  };

  // Calculate employees working at each hour
  const calculateEmployeesPerHour = () => {
    const employeesPerHour: number[] = Array(hours.length).fill(0);
    
    employees.forEach((employee) => {
      const employeeShifts = shifts.filter(s => s.employee_id === employee.id);
      employeeShifts.forEach((shift) => {
        const [startH, startM] = shift.start_time.split(':').map(Number);
        const [endH, endM] = shift.end_time.split(':').map(Number);
        
        hours.forEach((hour, index) => {
          const hourStart = fromHour + index;
          const hourEnd = hourStart + 1;
          
          // Check if shift covers this hour
          const shiftStartMinutes = startH * 60 + startM;
          const shiftEndMinutes = endH * 60 + endM;
          const hourStartMinutes = hourStart * 60;
          const hourEndMinutes = hourEnd * 60;
          
          const isWorking = shiftEndMinutes >= shiftStartMinutes
            ? (shiftStartMinutes < hourEndMinutes && shiftEndMinutes > hourStartMinutes)
            : (shiftStartMinutes < hourEndMinutes || shiftEndMinutes > hourStartMinutes);
          
          if (isWorking) {
            employeesPerHour[index]++;
          }
        });
      });
    });
    
    return employeesPerHour;
  };

  const employeesPerHour = calculateEmployeesPerHour();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Cargando timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-destructive/10 border-destructive/20">
        <p className="text-destructive">Error al cargar datos: {error}</p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header Controls */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <h2 className="text-lg font-semibold">
                  {new Date(date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Hoy
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {employees.length} empleados
              </Badge>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Timeline Grid */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header Row - Hours */}
              <div className="grid grid-cols-[200px_1fr] border-b bg-muted/50 sticky top-0 z-10">
                <div className="p-3 border-r font-semibold text-sm">
                  Empleado
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(60px, 1fr))` }}>
                  {hours.map((hour) => (
                    <div 
                      key={hour}
                      className="p-2 border-r last:border-r-0 text-center text-xs font-medium"
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Count Row */}
              <div className="grid grid-cols-[200px_1fr] border-b bg-blue-50 dark:bg-blue-950/20 sticky top-[49px] z-10">
                <div className="p-2 border-r text-xs font-semibold flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  Empleados activos
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(60px, 1fr))` }}>
                  {employeesPerHour.map((count, index) => (
                    <div 
                      key={index}
                      className="p-2 border-r last:border-r-0 text-center"
                    >
                      <Badge 
                        variant={count === 0 ? "outline" : "default"}
                        className="text-xs px-2 py-0.5"
                      >
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Rows */}
              <div className="divide-y">
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay empleados con turnos en este período
                  </div>
                ) : (
                  employees.map((employee) => {
                    const employeeShifts = shifts.filter(s => s.employee_id === employee.id);
                    const totalHours = calculateTotalHours(employeeShifts);
                    const overlaps = detectOverlaps(employeeShifts);
                    const shiftBlocks = getShiftBlocks(employeeShifts, fromHour, toHour);

                    return (
                      <div
                        key={employee.id}
                        className="grid grid-cols-[200px_1fr] hover:bg-muted/20 transition-colors"
                      >
                        {/* Employee Info Column */}
                        <div className="p-3 border-r flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={employee.avatar_url || undefined} />
                            <AvatarFallback>
                              {employee.name.charAt(0)}{employee.surname?.charAt(0) || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {employee.name} {employee.surname}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {employee.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {totalHours.toFixed(1)}h
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Column */}
                        <div 
                          className="relative grid" 
                          style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(60px, 1fr))` }}
                        >
                          {/* Hour Grid Lines */}
                          {hours.map((hour) => (
                            <div 
                              key={hour}
                              className="border-r last:border-r-0 h-full min-h-[60px]"
                            />
                          ))}

                          {/* Shift Blocks */}
                          {shiftBlocks.map((block, idx) => {
                            const hasOverlap = overlaps.some(o => 
                              o.shift1 === block.shift.id || o.shift2 === block.shift.id
                            );
                            const color = block.shift.color_hint || hashStringToColor(employee.id);
                            
                            return (
                              <Tooltip key={`${block.shift.id}-${idx}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="absolute cursor-pointer transition-all hover:z-20 hover:scale-105"
                                    style={{
                                      left: `${block.startPercent}%`,
                                      width: `${block.widthPercent}%`,
                                      top: hasOverlap ? '8px' : '4px',
                                      height: hasOverlap ? 'calc(100% - 24px)' : 'calc(100% - 8px)',
                                      backgroundColor: color,
                                      border: `2px solid ${color}`,
                                      filter: hasOverlap ? 'brightness(0.9)' : 'none',
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      minHeight: '40px'
                                    }}
                                    draggable
                                    onDragStart={() => handleShiftDragStart(block.shift.id)}
                                    onClick={() => setSelectedShift(block.shift)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Turno de ${employee.name} de ${block.shift.start_time} a ${block.shift.end_time}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        setSelectedShift(block.shift);
                                      }
                                    }}
                                  >
                                    <div className="text-xs font-medium text-white drop-shadow truncate">
                                      {block.shift.start_time} - {block.shift.end_time}
                                    </div>
                                    <div className="text-xs text-white/90 truncate">
                                      {block.shift.duration}
                                    </div>
                                    {hasOverlap && (
                                      <AlertTriangle className="absolute top-1 right-1 h-3 w-3 text-amber-500" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium">{employee.name} {employee.surname}</p>
                                    <p className="text-xs">{block.shift.start_time} - {block.shift.end_time}</p>
                                    {block.shift.location && (
                                      <p className="text-xs text-muted-foreground">📍 {block.shift.location}</p>
                                    )}
                                    {block.shift.status && (
                                      <Badge variant="outline" className="text-xs">
                                        {block.shift.status}
                                      </Badge>
                                    )}
                                    {block.shift.notes && (
                                      <p className="text-xs text-muted-foreground italic">
                                        {block.shift.notes}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Shift Detail Modal */}
        {selectedShift && (
          <ShiftDetailModal
            shift={selectedShift}
            employee={employees.find(e => e.id === selectedShift.employee_id)}
            isOpen={!!selectedShift}
            onClose={() => setSelectedShift(null)}
            onUpdate={(updates) => {
              updateShift(selectedShift.id, updates);
              setSelectedShift(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
