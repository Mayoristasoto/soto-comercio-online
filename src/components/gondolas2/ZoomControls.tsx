import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus } from "lucide-react";
import { useMobileDetection } from "@/hooks/use-mobile-detection";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minZoom: number;
  maxZoom: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  minZoom,
  maxZoom
}) => {
  const isMobile = useMobileDetection();

  if (isMobile) {
    return (
      <div className="px-4 pb-3">
        <Card className="bg-card/95 backdrop-blur-sm border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Zoom:</span>
                <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomOut}
                  disabled={zoom <= minZoom}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomIn}
                  disabled={zoom >= maxZoom}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Desktop version - positioned in top right
  return (
    <div className="fixed top-4 right-4 z-30">
      <Card className="bg-card/95 backdrop-blur-sm border">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Zoom:</span>
            <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onZoomOut}
                disabled={zoom <= minZoom}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onZoomIn}
                disabled={zoom >= maxZoom}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};