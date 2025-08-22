import { useState } from "react";
import { Gondola } from "@/pages/Gondolas";

interface InteractiveMapProps {
  gondolas: Gondola[];
  onGondolaHover: (gondola: Gondola | null) => void;
  onMouseMove: (position: { x: number; y: number }) => void;
}

export const InteractiveMap = ({ gondolas, onGondolaHover, onMouseMove }: InteractiveMapProps) => {
  const [selectedGondola, setSelectedGondola] = useState<string | null>(null);

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
    setSelectedGondola(selectedGondola === gondola.id ? null : gondola.id);
  };

  return (
    <div className="relative w-full overflow-auto">
      <svg
        width="1000"
        height="700"
        viewBox="0 0 1000 700"
        className="border border-border rounded-lg bg-muted/20"
        onMouseMove={handleMouseMove}
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
          const isSelected = selectedGondola === gondola.id;
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
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                onMouseEnter={(e) => handleMouseEnter(gondola, e)}
                onMouseLeave={handleMouseLeave}
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