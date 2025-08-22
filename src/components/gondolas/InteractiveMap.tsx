import { useState } from "react";
import { Gondola } from "@/pages/Gondolas";

interface InteractiveMapProps {
  gondolas: Gondola[];
  onGondolaHover: (gondola: Gondola | null) => void;
  onGondolaSelect: (gondola: Gondola | null) => void;
  onGondolaUpdate: (gondola: Gondola) => void;
  onMouseMove: (position: { x: number; y: number }) => void;
  isEditMode: boolean;
}

export const InteractiveMap = ({ 
  gondolas, 
  onGondolaHover, 
  onGondolaSelect, 
  onGondolaUpdate, 
  onMouseMove, 
  isEditMode 
}: InteractiveMapProps) => {
  const [selectedGondola, setSelectedGondola] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<{ gondolaId: string; handle: string } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (gondola: Gondola, event: React.MouseEvent) => {
    onGondolaHover(gondola);
    onMouseMove({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
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
            x: Math.max(0, gondola.position.x + deltaX * 0.5),
            y: Math.max(0, gondola.position.y + deltaY * 0.5)
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
        
        if (isResizing.handle.includes('right')) {
          newWidth = Math.max(50, gondola.position.width + deltaX * 0.5);
        }
        if (isResizing.handle.includes('bottom')) {
          newHeight = Math.max(30, gondola.position.height + deltaY * 0.5);
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

  return (
    <div className="relative w-full overflow-auto">
      <svg
        width="1000"
        height="700"
        viewBox="0 0 1000 700"
        className="border border-border rounded-lg bg-muted/20 cursor-default"
        onMouseMove={handleMouseMoveOnSvg}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                  {/* Bottom-right resize handle */}
                  <circle
                    cx={gondola.position.x + gondola.position.width}
                    cy={gondola.position.y + gondola.position.height}
                    r="4"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="1"
                    className="cursor-se-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'bottom-right', e)}
                  />
                  {/* Right resize handle */}
                  <circle
                    cx={gondola.position.x + gondola.position.width}
                    cy={gondola.position.y + gondola.position.height / 2}
                    r="4"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="1"
                    className="cursor-e-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'right', e)}
                  />
                  {/* Bottom resize handle */}
                  <circle
                    cx={gondola.position.x + gondola.position.width / 2}
                    cy={gondola.position.y + gondola.position.height}
                    r="4"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="1"
                    className="cursor-s-resize"
                    onMouseDown={(e) => handleResizeStart(gondola.id, 'bottom', e)}
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