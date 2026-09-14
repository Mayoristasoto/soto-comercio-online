import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ZoomIn } from "lucide-react";
import { Gondola } from "@/pages/Gondolas";

interface MiniMapProps {
  gondolas: Gondola[];
  currentView: { zoom: number; pan: { x: number; y: number } };
  onNavigate: (x: number, y: number) => void;
  onCenter: () => void;
  svgSize: { width: number; height: number };
}

export const MiniMap: React.FC<MiniMapProps> = ({
  gondolas,
  currentView,
  onNavigate,
  onCenter,
  svgSize
}) => {
  const miniMapSize = { width: 120, height: 80 };
  const scaleX = miniMapSize.width / svgSize.width;
  const scaleY = miniMapSize.height / svgSize.height;

  // Calculate viewport indicator position
  const viewportIndicator = {
    x: (-currentView.pan.x * scaleX) / currentView.zoom,
    y: (-currentView.pan.y * scaleY) / currentView.zoom,
    width: (window.innerWidth * scaleX) / currentView.zoom,
    height: (window.innerHeight * scaleY) / currentView.zoom,
  };

  const handleMiniMapClick = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scaleX;
    const y = (event.clientY - rect.top) / scaleY;
    onNavigate(x, y);
  };

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <Card className="p-2 bg-card/95 backdrop-blur-sm border-2">
        <div className="space-y-2">
          {/* Mini Map */}
          <div className="relative">
            <svg
              width={miniMapSize.width}
              height={miniMapSize.height}
              viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
              className="border border-border rounded cursor-pointer"
              onClick={handleMiniMapClick}
            >
              {/* Background */}
              <rect
                width={svgSize.width}
                height={svgSize.height}
                fill="hsl(var(--muted))"
              />
              
              {/* Gondolas */}
              {gondolas.map((gondola) => (
                <rect
                  key={gondola.id}
                  x={gondola.position.x}
                  y={gondola.position.y}
                  width={gondola.position.width}
                  height={gondola.position.height}
                  fill={gondola.status === 'available' ? '#22c55e' : '#ef4444'}
                  stroke="#666"
                  strokeWidth="1"
                />
              ))}
              
              {/* Viewport Indicator */}
              <rect
                x={Math.max(0, Math.min(svgSize.width - viewportIndicator.width, viewportIndicator.x))}
                y={Math.max(0, Math.min(svgSize.height - viewportIndicator.height, viewportIndicator.y))}
                width={Math.min(viewportIndicator.width, svgSize.width)}
                height={Math.min(viewportIndicator.height, svgSize.height)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
            </svg>
          </div>

          {/* Center Button */}
          <Button
            onClick={onCenter}
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
          >
            <Home className="h-3 w-3 mr-1" />
            Centrar
          </Button>
        </div>
      </Card>
    </div>
  );
};