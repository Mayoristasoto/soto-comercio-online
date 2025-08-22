import { useState, useRef, useEffect } from "react";
import { Gondola } from "@/pages/Gondolas";
import { useMobileDetection } from "@/hooks/use-mobile-detection";

interface InteractiveMapProps {
  gondolas: Gondola[];
  onGondolaHover: (gondola: Gondola | null) => void;
  onGondolaSelect: (gondola: Gondola | null) => void;
  onGondolaUpdate: (gondola: Gondola) => void;
  onGondolaAdd: (gondola: Gondola) => void;
  onMouseMove: (position: { x: number; y: number }) => void;
  isEditMode: boolean;
}

export const InteractiveMap = ({ 
  gondolas, 
  onGondolaHover, 
  onGondolaSelect, 
  onGondolaUpdate,
  onGondolaAdd, 
  onMouseMove, 
  isEditMode 
}: InteractiveMapProps) => {
  const [selectedGondola, setSelectedGondola] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<{ gondolaId: string; handle: string } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isCreating, setIsCreating] = useState<'gondola' | 'puntera' | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useMobileDetection();

  // Keyboard navigation
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedGondola) return;

      const gondola = gondolas.find(g => g.id === selectedGondola);
      if (!gondola) return;

      const step = 1;
      const resizeStep = 10;
      let shouldUpdate = false;
      let updatedGondola = { ...gondola };

      // Movement with arrow keys
      if (!event.ctrlKey && !event.metaKey) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            updatedGondola.position.y = Math.max(0, gondola.position.y - step);
            shouldUpdate = true;
            break;
          case 'ArrowDown':
            event.preventDefault();
            updatedGondola.position.y = gondola.position.y + step;
            shouldUpdate = true;
            break;
          case 'ArrowLeft':
            event.preventDefault();
            updatedGondola.position.x = Math.max(0, gondola.position.x - step);
            shouldUpdate = true;
            break;
          case 'ArrowRight':
            event.preventDefault();
            updatedGondola.position.x = gondola.position.x + step;
            shouldUpdate = true;
            break;
        }
      }
      
      // Resizing with Ctrl/Cmd + arrow keys
      if ((event.ctrlKey || event.metaKey)) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            updatedGondola.position.height = Math.max(20, gondola.position.height - resizeStep);
            shouldUpdate = true;
            break;
          case 'ArrowDown':
            event.preventDefault();
            updatedGondola.position.height = gondola.position.height + resizeStep;
            shouldUpdate = true;
            break;
          case 'ArrowLeft':
            event.preventDefault();
            updatedGondola.position.width = Math.max(20, gondola.position.width - resizeStep);
            shouldUpdate = true;
            break;
          case 'ArrowRight':
            event.preventDefault();
            updatedGondola.position.width = gondola.position.width + resizeStep;
            shouldUpdate = true;
            break;
        }
      }

      if (shouldUpdate) {
        onGondolaUpdate(updatedGondola);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, selectedGondola, gondolas, onGondolaUpdate]);

  const handleMouseEnter = (gondola: Gondola, event: React.MouseEvent) => {
    if (isDragging || isResizing) return;
    onGondolaHover(gondola);
    onMouseMove({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    if (isDragging || isResizing) return;
    onGondolaHover(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    onMouseMove({ x: event.clientX, y: event.clientY });
  };

  const handleClick = (gondola: Gondola, event: React.MouseEvent) => {
    if (!isEditMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('handleClick triggered for:', gondola.id, 'currently selected:', selectedGondola);
    
    // Solo manejar selección si no estamos arrastrando o redimensionando
    if (!isDragging && !isResizing && selectedGondola !== gondola.id) {
      console.log('Selecting gondola:', gondola.id);
      setSelectedGondola(gondola.id);
      onGondolaSelect(gondola);
    }
  };

  const handleMouseDown = (gondola: Gondola, event: React.MouseEvent) => {
    if (!isEditMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('handleMouseDown triggered for:', gondola.id);
    
    // Solo configurar el arrastre, la selección se maneja en onClick
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleMouseMoveOnSvg = (event: React.MouseEvent) => {
    onMouseMove({ x: event.clientX, y: event.clientY });
    
    if (isDragging && selectedGondola) {
      const gondola = gondolas.find(g => g.id === selectedGondola);
      if (gondola) {
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        
        const updatedGondola = {
          ...gondola,
          position: {
            ...gondola.position,
            x: Math.max(0, Math.min(1000 - gondola.position.width, gondola.position.x + deltaX * 1.5)),
            y: Math.max(0, Math.min(700 - gondola.position.height, gondola.position.y + deltaY * 1.5))
          }
        };
        
        onGondolaUpdate(updatedGondola);
        setDragStart({ x: event.clientX, y: event.clientY });
      }
    }
    
    if (isResizing && isResizing.gondolaId) {
      const gondola = gondolas.find(g => g.id === isResizing.gondolaId);
      if (gondola) {
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        
        let newWidth = gondola.position.width;
        let newHeight = gondola.position.height;
        
        if (isResizing.handle.includes('top-left')) {
          const widthDelta = -deltaX * 1.2;
          const heightDelta = -deltaY * 1.2;
          newWidth = Math.max(20, gondola.position.width + widthDelta);
          newHeight = Math.max(20, gondola.position.height + heightDelta);
          const updatedGondola = {
            ...gondola,
            position: {
              ...gondola.position,
              x: Math.max(0, gondola.position.x - widthDelta),
              y: Math.max(0, gondola.position.y - heightDelta),
              width: newWidth,
              height: newHeight
            }
          };
          onGondolaUpdate(updatedGondola);
          setDragStart({ x: event.clientX, y: event.clientY });
          return;
        }
        if (isResizing.handle.includes('top-right')) {
          const heightDelta = -deltaY * 1.2;
          newWidth = Math.max(20, gondola.position.width + deltaX * 1.2);
          newHeight = Math.max(20, gondola.position.height + heightDelta);
          const updatedGondola = {
            ...gondola,
            position: {
              ...gondola.position,
              y: Math.max(0, gondola.position.y - heightDelta),
              width: newWidth,
              height: newHeight
            }
          };
          onGondolaUpdate(updatedGondola);
          setDragStart({ x: event.clientX, y: event.clientY });
          return;
        }
        if (isResizing.handle.includes('bottom-left')) {
          const widthDelta = -deltaX * 1.2;
          newWidth = Math.max(20, gondola.position.width + widthDelta);
          newHeight = Math.max(20, gondola.position.height + deltaY * 1.2);
          const updatedGondola = {
            ...gondola,
            position: {
              ...gondola.position,
              x: Math.max(0, gondola.position.x - widthDelta),
              width: newWidth,
              height: newHeight
            }
          };
          onGondolaUpdate(updatedGondola);
          setDragStart({ x: event.clientX, y: event.clientY });
          return;
        }
        if (isResizing.handle.includes('bottom-right')) {
          newWidth = Math.max(20, gondola.position.width + deltaX * 1.2);
          newHeight = Math.max(20, gondola.position.height + deltaY * 1.2);
        }
        
        if (isResizing.handle === 'right') {
          newWidth = Math.max(20, gondola.position.width + deltaX * 1.2);
        }
        if (isResizing.handle === 'left') {
          const widthDelta = -deltaX * 1.2;
          newWidth = Math.max(20, gondola.position.width + widthDelta);
          const updatedGondola = {
            ...gondola,
            position: {
              ...gondola.position,
              x: Math.max(0, gondola.position.x - widthDelta),
              width: newWidth,
              height: newHeight
            }
          };
          onGondolaUpdate(updatedGondola);
          setDragStart({ x: event.clientX, y: event.clientY });
          return;
        }
        if (isResizing.handle === 'bottom') {
          newHeight = Math.max(20, gondola.position.height + deltaY * 1.2);
        }
        if (isResizing.handle === 'top') {
          const heightDelta = -deltaY * 1.2;
          newHeight = Math.max(20, gondola.position.height + heightDelta);
          const updatedGondola = {
            ...gondola,
            position: {
              ...gondola.position,
              y: Math.max(0, gondola.position.y - heightDelta),
              width: newWidth,
              height: newHeight
            }
          };
          onGondolaUpdate(updatedGondola);
          setDragStart({ x: event.clientX, y: event.clientY });
          return;
        }
        
        const updatedGondola = {
          ...gondola,
          position: {
            ...gondola.position,
            width: newWidth,
            height: newHeight
          }
        };
        
        onGondolaUpdate(updatedGondola);
        setDragStart({ x: event.clientX, y: event.clientY });
      }
    }
  };

  const handleResizeStart = (gondolaId: string, handle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsResizing({ gondolaId, handle });
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleZoom = (delta: number) => {
    // Aumentar el rango de zoom para mejor experiencia móvil
    const newZoom = Math.max(0.3, Math.min(4, zoom + delta));
    setZoom(newZoom);
  };

  // Touch event handlers for mobile support
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    // Permitir el comportamiento por defecto para mejorar el rendimiento
    if (event.touches.length === 1) {
      // Single touch - pan con throttling mejorado
      const touch = event.touches[0];
      setIsPanning(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    } else if (event.touches.length === 2) {
      // Two touches - zoom
      event.preventDefault(); // Solo prevenir cuando es necesario
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 1 && isPanning) {
      // Single touch - pan optimizado y más responsivo
      const touch = event.touches[0];
      const newPan = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      };
      
      // Aplicar pan inmediatamente para mejor respuesta
      setPan(newPan);
    } else if (event.touches.length === 2) {
      event.preventDefault();
      // Two touches - zoom and pan con mayor sensibilidad
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);
      
      if (lastTouchDistance > 0) {
        // Aumentar sensibilidad del zoom para móvil
        const zoomDelta = (distance - lastTouchDistance) * 0.008; // Aumentado de 0.003
        handleZoom(zoomDelta);
      }
      
      // Pan más responsivo basado en movimiento del centro
      const centerDeltaX = center.x - lastTouchCenter.x;
      const centerDeltaY = center.y - lastTouchCenter.y;
      
      setPan(prev => ({
        x: prev.x + centerDeltaX * 1.2, // Aumentar sensibilidad del pan
        y: prev.y + centerDeltaY * 1.2
      }));
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setLastTouchDistance(0);
  };

  const handleSvgClick = (event: React.MouseEvent) => {
    // Solo crear nuevas góndolas si estamos en modo creación
    if (isCreating && !isDragging && !isResizing && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      
      // Generar ID único sin límites
      const existingGondolaIds = gondolas.filter(g => g.type === 'gondola').map(g => parseInt(g.id.replace('g', '')) || 0);
      const existingPunteraIds = gondolas.filter(g => g.type === 'puntera').map(g => parseInt(g.id.replace('p', '')) || 0);
      
      const getNextId = (existingIds: number[], prefix: string) => {
        let nextNum = 1;
        while (existingIds.includes(nextNum)) {
          nextNum++;
        }
        return `${prefix}${nextNum}`;
      };
      
      const newId = isCreating === 'gondola' ? 
        getNextId(existingGondolaIds, 'g') : 
        getNextId(existingPunteraIds, 'p');
      
      const newGondola: Gondola = {
        id: newId,
        type: isCreating,
        position: { 
          x: Math.max(0, x - 70), 
          y: Math.max(0, y - 30), 
          width: isCreating === 'gondola' ? 140 : 40, 
          height: 60 
        },
        status: 'available',
        brand: null,
        category: 'Disponible',
        section: newId.toUpperCase()
      };
      
      onGondolaAdd(newGondola);
      setIsCreating(null);
    } else if (!isCreating && !isDragging && !isResizing) {
      // Deseleccionar si hacemos click en el fondo
      setSelectedGondola(null);
      onGondolaSelect(null);
    }
  };

  const handlePanStart = (event: React.MouseEvent) => {
    // Allow panning with right mouse button or when holding space key
    if (event.button === 2 || event.shiftKey) {
      event.preventDefault();
      setIsPanning(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
      return;
    }
    
    // Original logic for non-edit mode
    if (isEditMode || isCreating) return;
    setIsPanning(true);
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const handlePan = (event: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    });
  };

  return (
    <div className={`relative w-full overflow-hidden ${
      isMobile && !isEditMode ? 'h-screen flex items-center justify-center' : ''
    }`}>
      {/* Rotación aplicada solo al contenedor en móvil */}
      <div 
        className={`${isMobile && !isEditMode ? 'transform rotate-90 origin-center' : ''}`}
        style={{
          width: isMobile && !isEditMode ? '100vh' : '100%',
          height: isMobile && !isEditMode ? '100vw' : 'auto',
        }}
      >
      {/* Controles de zoom optimizados para móvil */}
      <div className={`absolute ${isMobile ? 'bottom-4 right-4' : 'top-4 left-4'} z-10 flex flex-col gap-3`}>
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 bg-background/95 rounded-xl p-3 border shadow-lg backdrop-blur-sm`}>
          <button
            onClick={() => handleZoom(0.3)}
            className={`${isMobile ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-lg'} flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-md transition-all duration-200 active:scale-95`}
          >
            +
          </button>
          <button
            onClick={() => handleZoom(-0.3)}
            className={`${isMobile ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-lg'} flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-md transition-all duration-200 active:scale-95`}
          >
            −
          </button>
          <div className={`${isMobile ? 'w-14 h-12 text-sm' : 'w-12 h-10 text-xs'} flex items-center justify-center bg-muted rounded-xl font-medium border`}>
            {Math.round(zoom * 100)}%
          </div>
        </div>
        
        {/* Botón de centrar mejorado para móvil */}
        {isMobile && (
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl px-4 py-3 text-sm font-medium shadow-md transition-all duration-200 active:scale-95"
          >
            🎯 Centrar Vista
          </button>
        )}
        
        {isEditMode && (
          <div className="flex flex-col gap-1 bg-background/90 rounded-lg p-2 border">
            <button
              onClick={() => setIsCreating(isCreating === 'gondola' ? null : 'gondola')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isCreating === 'gondola' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              + Góndola
            </button>
            <button
              onClick={() => setIsCreating(isCreating === 'puntera' ? null : 'puntera')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isCreating === 'puntera' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              + Puntera
            </button>
            <div className="text-xs text-muted-foreground mt-1 p-1">
              Shift + arrastrar para mover vista
            </div>
          </div>
        )}
        
        {/* Instrucciones optimizadas para móvil */}
        {isMobile && !isEditMode && (
          <div className="absolute top-4 left-4 bg-background/95 rounded-xl p-4 border shadow-lg max-w-72 backdrop-blur-sm">
            <div className="text-sm text-foreground space-y-2">
              <div className="font-semibold text-primary flex items-center gap-2">
                📱 <span>Controles Táctiles</span>
              </div>
              <div className="text-xs space-y-1">
                <div>👆 <strong>Un dedo:</strong> Mover mapa</div>
                <div>🤏 <strong>Pinch:</strong> Zoom (pellizcar)</div>
                <div>🎯 <strong>Botón derecha:</strong> Centrar vista</div>
                <div>👇 <strong>Toca góndola:</strong> Ver información</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <svg
        ref={svgRef}
        width="1000"
        height="700"
        viewBox="0 0 1000 700"
        className={`border border-border rounded-lg bg-muted/20 ${
          isCreating ? 'cursor-crosshair' : isPanning ? 'cursor-move' : 'cursor-default'
        } ${isMobile && !isEditMode ? 'transform transition-transform duration-300' : ''}`}
        onContextMenu={(e) => e.preventDefault()}
        onMouseMove={(e) => {
          handleMouseMoveOnSvg(e);
          handlePan(e);
        }}
        onMouseUp={() => {
          handleMouseUp();
          setIsPanning(false);
        }}
        onMouseLeave={() => {
          handleMouseUp();
          setIsPanning(false);
        }}
        onMouseDown={handlePanStart}
        onClick={handleSvgClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
          touchAction: isMobile ? 'none' : 'pan-x pan-y', // Prevenir scroll nativo en móvil
          willChange: 'transform', // Optimizar para animaciones
          backfaceVisibility: 'hidden', // Acelerar con GPU
          userSelect: 'none' // Prevenir selección de texto en móvil
        }}
      >
        {/* Background floor plan */}
        <image
          href="/lovable-uploads/d3b32fd2-a19d-44d5-a8e2-b167fe688726.png"
          x="0"
          y="0"
          width="1000"
          height="700"
          opacity="0.3"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Grid lines for reference */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Gondolas and Punteras */}
        {gondolas.map((gondola) => {
          const isSelected = selectedGondola === gondola.id && isEditMode;
          const isOccupied = gondola.status === 'occupied';
          
          return (
            <g key={gondola.id}>
              <rect
                x={gondola.position.x}
                y={gondola.position.y}
                width={gondola.position.width}
                height={gondola.position.height}
                fill={isOccupied ? "hsl(0 84% 60%)" : "hsl(142 76% 36%)"}
                stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isSelected ? "3" : "1"}
                rx="4"
                opacity={isSelected ? "0.9" : "0.7"}
                className={`transition-opacity duration-150 hover:opacity-90 ${
                  isEditMode ? 'cursor-move' : 'cursor-pointer'
                }`}
                style={{
                  willChange: 'opacity, transform'
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  !isDragging && !isResizing && handleMouseEnter(gondola, e);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  !isDragging && !isResizing && handleMouseLeave();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(gondola, e);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(gondola, e);
                }}
              />
              
              {/* Label */}
              <text
                x={gondola.position.x + gondola.position.width / 2}
                y={gondola.position.y + gondola.position.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
                pointerEvents="none"
              >
                {gondola.section}
              </text>
              
              {/* Type indicator */}
              <text
                x={gondola.position.x + gondola.position.width / 2}
                y={gondola.position.y + gondola.position.height / 2 + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill="white"
                opacity="0.8"
                pointerEvents="none"
              >
                {gondola.type === 'puntera' ? 'P' : 'G'}
              </text>
              
              {/* Resize handles for edit mode */}
              {isEditMode && isSelected && (
                <>
                  {/* Corner handles */}
                  <circle
                    cx={gondola.position.x}
                    cy={gondola.position.y}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-nw-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'top-left', e)}
                  />
                  <circle
                    cx={gondola.position.x + gondola.position.width}
                    cy={gondola.position.y}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-ne-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'top-right', e)}
                  />
                  <circle
                    cx={gondola.position.x}
                    cy={gondola.position.y + gondola.position.height}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-sw-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'bottom-left', e)}
                  />
                  <circle
                    cx={gondola.position.x + gondola.position.width}
                    cy={gondola.position.y + gondola.position.height}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-se-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'bottom-right', e)}
                  />
                  
                  {/* Side handles */}
                  <circle
                    cx={gondola.position.x + gondola.position.width / 2}
                    cy={gondola.position.y}
                    r="5"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-n-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'top', e)}
                  />
                  <circle
                    cx={gondola.position.x + gondola.position.width}
                    cy={gondola.position.y + gondola.position.height / 2}
                    r="5"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-e-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'right', e)}
                  />
                  <circle
                    cx={gondola.position.x + gondola.position.width / 2}
                    cy={gondola.position.y + gondola.position.height}
                    r="5"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-s-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'bottom', e)}
                  />
                  <circle
                    cx={gondola.position.x}
                    cy={gondola.position.y + gondola.position.height / 2}
                    r="5"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-w-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'left', e)}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="200" height="100" fill="hsl(var(--background))" stroke="hsl(var(--border))" rx="4" opacity="0.9"/>
          <text x="10" y="20" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">Leyenda</text>
          
          <rect x="10" y="30" width="15" height="10" fill="hsl(0 84% 60%)" rx="2"/>
          <text x="30" y="39" fontSize="10" fill="hsl(var(--foreground))">Ocupada</text>
          
          <rect x="10" y="45" width="15" height="10" fill="hsl(142 76% 36%)" rx="2"/>
          <text x="30" y="54" fontSize="10" fill="hsl(var(--foreground))">Disponible</text>
          
          <text x="10" y="70" fontSize="8" fill="hsl(var(--muted-foreground))">G = Góndola</text>
          <text x="10" y="82" fontSize="8" fill="hsl(var(--muted-foreground))">P = Puntera</text>
        </g>
      </svg>
      </div>
    </div>
  );
};