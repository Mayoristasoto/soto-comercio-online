import { useState, useRef, useEffect } from "react";
import { Gondola } from "@/pages/Gondolas";

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
  const svgRef = useRef<SVGSVGElement>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedGondola) return;

      const gondola = gondolas.find(g => g.id === selectedGondola);
      if (!gondola) return;

      const step = 5;
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

  const handleClick = (gondola: Gondola) => {
    if (isEditMode) {
      setSelectedGondola(selectedGondola === gondola.id ? null : gondola.id);
      onGondolaSelect(selectedGondola === gondola.id ? null : gondola);
    }
  };

  const handleMouseDown = (gondola: Gondola, event: React.MouseEvent) => {
    if (!isEditMode) return;
    
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setSelectedGondola(gondola.id);
    onGondolaSelect(gondola);
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
            x: Math.max(0, Math.min(1000 - gondola.position.width, gondola.position.x + deltaX * 0.8)),
            y: Math.max(0, Math.min(700 - gondola.position.height, gondola.position.y + deltaY * 0.8))
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
          const widthDelta = -deltaX * 0.8;
          const heightDelta = -deltaY * 0.8;
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
          const heightDelta = -deltaY * 0.8;
          newWidth = Math.max(20, gondola.position.width + deltaX * 0.8);
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
          const widthDelta = -deltaX * 0.8;
          newWidth = Math.max(20, gondola.position.width + widthDelta);
          newHeight = Math.max(20, gondola.position.height + deltaY * 0.8);
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
          newWidth = Math.max(20, gondola.position.width + deltaX * 0.8);
          newHeight = Math.max(20, gondola.position.height + deltaY * 0.8);
        }
        
        if (isResizing.handle === 'right') {
          newWidth = Math.max(20, gondola.position.width + deltaX * 0.8);
        }
        if (isResizing.handle === 'left') {
          const widthDelta = -deltaX * 0.8;
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
          newHeight = Math.max(20, gondola.position.height + deltaY * 0.8);
        }
        if (isResizing.handle === 'top') {
          const heightDelta = -deltaY * 0.8;
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
    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);
  };

  const handleSvgClick = (event: React.MouseEvent) => {
    if (!isCreating || !svgRef.current || isDragging || isResizing) return;
    
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    
    const newId = isCreating === 'gondola' ? 
      `g${gondolas.filter(g => g.type === 'gondola').length + 1}` : 
      `p${gondolas.filter(g => g.type === 'puntera').length + 1}`;
    
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
  };

  const handlePanStart = (event: React.MouseEvent) => {
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
    <div className="relative w-full overflow-hidden">
      {/* Controles de zoom y creación */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex gap-1 bg-background/90 rounded-lg p-1 border">
          <button
            onClick={() => handleZoom(0.2)}
            className="w-8 h-8 flex items-center justify-center bg-secondary hover:bg-secondary/80 rounded text-sm font-bold"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="w-8 h-8 flex items-center justify-center bg-secondary hover:bg-secondary/80 rounded text-sm font-bold"
          >
            -
          </button>
          <span className="w-12 h-8 flex items-center justify-center text-xs bg-muted rounded">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        
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
        }`}
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
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
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
                className={`transition-all duration-200 hover:opacity-90 ${
                  isEditMode ? 'cursor-move' : 'cursor-pointer'
                }`}
                onMouseEnter={(e) => !isDragging && !isResizing && handleMouseEnter(gondola, e)}
                onMouseLeave={() => !isDragging && !isResizing && handleMouseLeave()}
                onMouseDown={(e) => handleMouseDown(gondola, e)}
                onClick={() => handleClick(gondola)}
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
  );
};