import { useState, useRef, useEffect } from "react";
import { Gondola } from "@/pages/Gondolas";
import { useMobileDetection } from "@/hooks/use-mobile-detection";
import { MobileGondolaModal } from "./MobileGondolaModal";

interface ViewportSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface GraphicElement {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'text';
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  text_content?: string;
  font_size?: number;
  font_family?: string;
  font_weight?: 'normal' | 'bold';
  font_style?: 'normal' | 'italic';
  text_decoration?: 'none' | 'underline';
  stroke_width?: number;
  stroke_color?: string;
  fill_color?: string;
  rotation?: number;
  z_index?: number;
  is_visible?: boolean;
  text_align?: 'left' | 'center' | 'right';
}

interface InteractiveMapProps {
  gondolas: Gondola[];
  onGondolaHover: (gondola: Gondola | null) => void;
  onGondolaSelect: (gondola: Gondola | null) => void;
  onGondolaUpdate: (gondola: Gondola) => void;
  onGondolaAdd: (gondola: Gondola) => void;
  onMouseMove: (position: { x: number; y: number }) => void;
  isEditMode: boolean;
  viewport?: ViewportSettings;
  graphicElements?: GraphicElement[];
  selectedGraphicElement?: GraphicElement | null;
  onGraphicElementSelect?: (element: GraphicElement | null) => void;
  onGraphicElementUpdate?: (element: GraphicElement) => void;
  isViewportSelecting?: boolean;
  onViewportChange?: (viewport: ViewportSettings) => void;
}

export const InteractiveMap = ({ 
  gondolas, 
  onGondolaHover, 
  onGondolaSelect, 
  onGondolaUpdate,
  onGondolaAdd, 
  onMouseMove, 
  isEditMode,
  viewport,
  graphicElements = [],
  selectedGraphicElement,
  onGraphicElementSelect,
  onGraphicElementUpdate,
  isViewportSelecting = false,
  onViewportChange
}: InteractiveMapProps) => {
  const isMobile = useMobileDetection();
  
  const [selectedGondola, setSelectedGondola] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<{ gondolaId: string; handle: string } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Zoom inicial más grande en móvil con límites como Google Maps
  const [zoom, setZoom] = useState(isMobile ? 1.2 : 1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isCreating, setIsCreating] = useState<'gondola' | 'puntera' | null>(null);
  const [isSelectingViewport, setIsSelectingViewport] = useState(false);
  const [viewportSelectionStart, setViewportSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [viewportSelectionCurrent, setViewportSelectionCurrent] = useState<{ x: number; y: number } | null>(null);
  
  // Estados para arrastrar elementos gráficos
  const [isDraggingGraphicElement, setIsDraggingGraphicElement] = useState(false);
  const [draggedGraphicElement, setDraggedGraphicElement] = useState<GraphicElement | null>(null);
  const [graphicElementDragStart, setGraphicElementDragStart] = useState({ x: 0, y: 0 });
  
  // Enhanced mobile touch optimizations como Google Maps
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartCenter, setTouchStartCenter] = useState<{ x: number; y: number } | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panInitialOffset, setPanInitialOffset] = useState<{ x: number; y: number } | null>(null);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [lastPanTime, setLastPanTime] = useState(0);
  const [momentumAnimation, setMomentumAnimation] = useState<number | null>(null);
  
  // Límites como Google Maps
  const minZoom = 0.5;
  const maxZoom = 3;
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [selectedMobileGondola, setSelectedMobileGondola] = useState<Gondola | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Use effect to update viewport selection state when prop changes
  useEffect(() => {
    setIsSelectingViewport(isViewportSelecting);
    if (!isViewportSelecting) {
      setViewportSelectionStart(null);
      setViewportSelectionCurrent(null);
    }
  }, [isViewportSelecting]);

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

  // Touch handlers para tooltips en móvil - ahora abre modal
  const handleTouchStartOnGondola = (gondola: Gondola, event: React.TouchEvent) => {
    if (isDragging || isResizing || isPanning || event.touches.length > 1) return;
    
    event.stopPropagation();
    
    if (isMobile) {
      // En móvil abrir modal en lugar de tooltip
      setSelectedMobileGondola(gondola);
      setShowMobileModal(true);
    } else {
      // En desktop mantener tooltip
      const touch = event.touches[0];
      onGondolaHover(gondola);
      onMouseMove({ x: touch.clientX, y: touch.clientY });
      
      setTimeout(() => {
        onGondolaHover(null);
      }, 3000);
    }
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
    setIsDraggingGraphicElement(false);
    setDraggedGraphicElement(null);
  };

  // Función para iniciar el arrastre de elementos gráficos
  const handleGraphicElementMouseDown = (element: GraphicElement, event: React.MouseEvent) => {
    if (!isEditMode) return;
    
    event.stopPropagation();
    
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      
      setIsDraggingGraphicElement(true);
      setDraggedGraphicElement(element);
      setGraphicElementDragStart({
        x: x - element.position_x,
        y: y - element.position_y
      });
      
      // Seleccionar el elemento al empezar a arrastrarlo
      onGraphicElementSelect?.(element);
    }
  };

  const handleMouseMoveOnSvg = (event: React.MouseEvent) => {
    onMouseMove({ x: event.clientX, y: event.clientY });

    // Handle viewport selection dragging
    if (isSelectingViewport && viewportSelectionStart && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      setViewportSelectionCurrent({ x, y });
    }
    
    // Handle graphic element dragging
    if (isDraggingGraphicElement && draggedGraphicElement && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      
      const newElement = {
        ...draggedGraphicElement,
        position_x: x - graphicElementDragStart.x,
        position_y: y - graphicElementDragStart.y
      };
      
      onGraphicElementUpdate?.(newElement);
      return;
    }
    
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

  // Momentum y inercia como Google Maps
  useEffect(() => {
    if (momentumAnimation) {
      clearInterval(momentumAnimation);
    }
    
    if (!isPanning && (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1)) {
      const interval = setInterval(() => {
        setVelocity(prev => {
          const friction = 0.95; // Factor de fricción
          const newVelocity = {
            x: prev.x * friction,
            y: prev.y * friction
          };
          
          // Aplicar momentum al pan con límites
          setPan(currentPan => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const mapWidth = 1000 * zoom;
            const mapHeight = 700 * zoom;
            
            const maxPanX = Math.max(0, (mapWidth - screenWidth) / 2 + 100);
            const maxPanY = Math.max(0, (mapHeight - screenHeight) / 2 + 100);
            const minPanX = -maxPanX;
            const minPanY = -maxPanY;
            
            const newPanX = Math.max(minPanX, Math.min(maxPanX, currentPan.x + newVelocity.x));
            const newPanY = Math.max(minPanY, Math.min(maxPanY, currentPan.y + newVelocity.y));
            
            return { x: newPanX, y: newPanY };
          });
          
          // Parar si la velocidad es muy baja
          if (Math.abs(newVelocity.x) < 0.1 && Math.abs(newVelocity.y) < 0.1) {
            clearInterval(interval);
            setMomentumAnimation(null);
            return { x: 0, y: 0 };
          }
          
          return newVelocity;
        });
      }, 16); // 60fps
      
      setMomentumAnimation(interval as unknown as number);
    }
    
    return () => {
      if (momentumAnimation) {
        clearInterval(momentumAnimation);
      }
    };
  }, [isPanning, velocity, zoom]);

  const handleZoom = (delta: number, centerPoint?: { x: number; y: number }) => {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));
    
    if (centerPoint && svgRef.current) {
      // Zoom centrado en el punto como Google Maps
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = centerPoint.x - rect.left;
      const centerY = centerPoint.y - rect.top;
      
      const zoomRatio = newZoom / zoom;
      const newPanX = centerX - (centerX - pan.x) * zoomRatio;
      const newPanY = centerY - (centerY - pan.y) * zoomRatio;
      
      setPan({ x: newPanX, y: newPanY });
    }
    
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
    // Parar momentum
    if (momentumAnimation) {
      clearInterval(momentumAnimation);
      setMomentumAnimation(null);
    }
    setVelocity({ x: 0, y: 0 });
    
    if (event.touches.length === 1) {
      // Single touch - iniciar pan
      const touch = event.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setPanInitialOffset({ x: pan.x, y: pan.y });
      setLastPanPosition({ x: touch.clientX, y: touch.clientY });
      setLastPanTime(Date.now());
    } else if (event.touches.length === 2) {
      // Two touches - iniciar zoom
      event.preventDefault();
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);
      setTouchStartDistance(distance);
      setTouchStartCenter(center);
      setIsPanning(false);
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 1 && isPanning && panStart && panInitialOffset) {
      // Single touch - pan suave como Google Maps
      const touch = event.touches[0];
      const deltaX = touch.clientX - panStart.x;
      const deltaY = touch.clientY - panStart.y;
      
      // Calcular velocidad para momentum
      const currentTime = Date.now();
      const timeDelta = currentTime - lastPanTime;
      if (timeDelta > 0) {
        const velocityX = (touch.clientX - lastPanPosition.x) / timeDelta * 16;
        const velocityY = (touch.clientY - lastPanPosition.y) / timeDelta * 16;
        setVelocity({ x: velocityX, y: velocityY });
      }
      setLastPanPosition({ x: touch.clientX, y: touch.clientY });
      setLastPanTime(currentTime);
      
      // Aplicar pan con límites suaves
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const mapWidth = 1000 * zoom;
      const mapHeight = 700 * zoom;
      
      const maxPanX = Math.max(0, (mapWidth - screenWidth) / 2 + 100);
      const maxPanY = Math.max(0, (mapHeight - screenHeight) / 2 + 100);
      const minPanX = -maxPanX;
      const minPanY = -maxPanY;
      
      const newPanX = panInitialOffset.x + deltaX;
      const newPanY = panInitialOffset.y + deltaY;
      
      // Resistencia en los bordes como Google Maps
      const clampedX = Math.max(minPanX - 50, Math.min(maxPanX + 50, newPanX));
      const clampedY = Math.max(minPanY - 50, Math.min(maxPanY + 50, newPanY));
      
      setPan({ x: clampedX, y: clampedY });
      
    } else if (event.touches.length === 2) {
      event.preventDefault();
      // Two touches - zoom suave centrado como Google Maps
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);
      
      if (touchStartDistance && touchStartDistance > 0) {
        const zoomDelta = (distance - touchStartDistance) * 0.005; // Sensibilidad perfecta
        handleZoom(zoomDelta, center);
        setTouchStartDistance(distance);
      }
      
      // Pan durante zoom si el centro se mueve
      if (touchStartCenter) {
        const centerDeltaX = center.x - touchStartCenter.x;
        const centerDeltaY = center.y - touchStartCenter.y;
        
        setPan(prev => ({
          x: prev.x + centerDeltaX * 0.8,
          y: prev.y + centerDeltaY * 0.8
        }));
        
        setTouchStartCenter(center);
      }
    }
  };

  const handleTouchEnd = () => {
    // No resetear pan aquí para mantener momentum
    if (isPanning) {
      setIsPanning(false);
    }
    setTouchStartDistance(null);
    setTouchStartCenter(null);
    setPanStart(null);
    setPanInitialOffset(null);
  };

  const handleSvgClick = (event: React.MouseEvent) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;

    // Handle viewport selection
    if (isSelectingViewport) {
      if (!viewportSelectionStart) {
        setViewportSelectionStart({ x, y });
        setViewportSelectionCurrent({ x, y });
      } else {
        // Complete viewport selection
        const startX = Math.min(viewportSelectionStart.x, x);
        const startY = Math.min(viewportSelectionStart.y, y);
        const width = Math.abs(x - viewportSelectionStart.x);
        const height = Math.abs(y - viewportSelectionStart.y);
        
        const newViewport: ViewportSettings = {
          x: startX,
          y: startY,
          width: Math.max(100, width), // Minimum viewport size
          height: Math.max(100, height),
          zoom: 1
        };
        
        onViewportChange?.(newViewport);
        setIsSelectingViewport(false);
        setViewportSelectionStart(null);
        setViewportSelectionCurrent(null);
      }
      return;
    }

    // Solo crear nuevas góndolas si estamos en modo creación
    if (isCreating && !isDragging && !isResizing) {
      
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
    
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    
    setPan({
      x: pan.x + deltaX,
      y: pan.y + deltaY
    });
    
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  // Zoom con rueda del mouse en desktop
  const handleWheel = (event: React.WheelEvent) => {
    if (!isMobile) {
      event.preventDefault();
      const zoomDelta = -event.deltaY * 0.001;
      const centerPoint = { x: event.clientX, y: event.clientY };
      handleZoom(zoomDelta, centerPoint);
    }
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden shadow-inner">
      {/* Tarjeta de controles para móvil */}
      {isMobile && (
        <div className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleZoom(0.3)}
              className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
              disabled={zoom >= maxZoom}
              aria-label="Acercar"
            >
              <span className="text-lg font-bold">+</span>
            </button>
            <button
              onClick={() => handleZoom(-0.3)}
              className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
              disabled={zoom <= minZoom}
              aria-label="Alejar"
            >
              <span className="text-lg font-bold">−</span>
            </button>
            <button
              onClick={() => {
                setZoom(isMobile ? 1.2 : 1);
                setPan({ x: 0, y: 0 });
                setVelocity({ x: 0, y: 0 });
              }}
              className="w-10 h-10 bg-secondary text-secondary-foreground rounded-lg flex items-center justify-center hover:bg-secondary/90 transition-colors shadow-sm"
              aria-label="Centrar mapa"
            >
              <span className="text-sm">🏠</span>
            </button>
          </div>
        </div>
      )}

      <div 
        className="w-full h-[600px] relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handlePanStart}
        onMouseMove={handlePan}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          backgroundImage: `
            radial-gradient(circle at 25px 25px, rgba(0,0,0,0.1) 1px, transparent 1px),
            radial-gradient(circle at 75px 75px, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          transition: isPanning ? 'none' : 'background-position 0.3s ease-out'
        }}
      >
        <svg
          ref={svgRef}
          width="1000"
          height="700"
          viewBox={!isEditMode && viewport 
            ? `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}` 
            : "0 0 1000 700"
          }
          className="absolute inset-0 w-full h-full"
          onMouseMove={handleMouseMoveOnSvg}
          onMouseUp={handleMouseUp}
          onClick={handleSvgClick}
          style={{
            transform: `${isMobile ? 'rotate(90deg) ' : ''}translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: isMobile ? 'center center' : '0 0',
            transition: isPanning || momentumAnimation ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
            cursor: isCreating ? 'crosshair' : 'inherit'
          }}
        >
        {/* Controles de zoom estilo Google Maps para desktop */}
        {!isMobile && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-40">
            <button
              onClick={() => handleZoom(0.2)}
              className="w-10 h-10 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              disabled={zoom >= maxZoom}
            >
              <span className="text-xl font-bold text-gray-700">+</span>
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="w-10 h-10 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              disabled={zoom <= minZoom}
            >
              <span className="text-xl font-bold text-gray-700">−</span>
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setVelocity({ x: 0, y: 0 });
              }}
              className="w-10 h-10 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Centrar mapa"
            >
              <span className="text-sm">🏠</span>
            </button>
          </div>
        )}

        {/* Indicador de zoom */}
        <div className={`absolute ${isMobile ? 'top-4 right-4' : 'top-4 left-4'} bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-40`}>
          {(zoom * 100).toFixed(0)}%
        </div>
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
                onTouchStart={(e) => {
                  handleTouchStartOnGondola(gondola, e);
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

        {/* Graphic Elements */}
        {graphicElements.filter(el => el.is_visible).map((element) => {
          const isSelected = selectedGraphicElement?.id === element.id && isEditMode;
          
          return (
            <g key={element.id}>
              {element.type === 'rectangle' && (
                <rect
                  x={element.position_x}
                  y={element.position_y}
                  width={element.width || 100}
                  height={element.height || 50}
                  fill={element.fill_color || '#ffffff'}
                  stroke={element.stroke_color || '#000000'}
                  strokeWidth={element.stroke_width || 1}
                  opacity={element.opacity || 1}
                  transform={`rotate(${element.rotation || 0} ${element.position_x + (element.width || 100) / 2} ${element.position_y + (element.height || 50) / 2})`}
                  className={isEditMode ? 'cursor-move' : 'cursor-default'}
                  style={{ outline: isSelected ? '2px solid hsl(var(--primary))' : 'none' }}
                  onMouseDown={(e) => {
                    if (isEditMode) {
                      handleGraphicElementMouseDown(element, e);
                    }
                  }}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      onGraphicElementSelect?.(element);
                    }
                  }}
                />
              )}
              
              {element.type === 'circle' && (
                <circle
                  cx={element.position_x + (element.width || 100) / 2}
                  cy={element.position_y + (element.height || 100) / 2}
                  r={Math.min((element.width || 100), (element.height || 100)) / 2}
                  fill={element.fill_color || '#ffffff'}
                  stroke={element.stroke_color || '#000000'}
                  strokeWidth={element.stroke_width || 1}
                  opacity={element.opacity || 1}
                  className={isEditMode ? 'cursor-move' : 'cursor-default'}
                  style={{ outline: isSelected ? '2px solid hsl(var(--primary))' : 'none' }}
                  onMouseDown={(e) => {
                    if (isEditMode) {
                      handleGraphicElementMouseDown(element, e);
                    }
                  }}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      onGraphicElementSelect?.(element);
                    }
                  }}
                />
              )}
              
              {element.type === 'line' && (
                <line
                  x1={element.position_x}
                  y1={element.position_y}
                  x2={element.position_x + (element.width || 100)}
                  y2={element.position_y}
                  stroke={element.stroke_color || '#000000'}
                  strokeWidth={element.stroke_width || 2}
                  opacity={element.opacity || 1}
                  transform={`rotate(${element.rotation || 0} ${element.position_x + (element.width || 100) / 2} ${element.position_y})`}
                  className={isEditMode ? 'cursor-move' : 'cursor-default'}
                  style={{ outline: isSelected ? '2px solid hsl(var(--primary))' : 'none' }}
                  onMouseDown={(e) => {
                    if (isEditMode) {
                      handleGraphicElementMouseDown(element, e);
                    }
                  }}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      onGraphicElementSelect?.(element);
                    }
                  }}
                />
              )}
              
              {element.type === 'arrow' && (
                <g>
                  <defs>
                    <marker
                      id={`arrowhead-${element.id}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={element.stroke_color || '#000000'}
                      />
                    </marker>
                  </defs>
                  <line
                    x1={element.position_x}
                    y1={element.position_y}
                    x2={element.position_x + (element.width || 100)}
                    y2={element.position_y}
                    stroke={element.stroke_color || '#000000'}
                    strokeWidth={element.stroke_width || 2}
                    opacity={element.opacity || 1}
                    markerEnd={`url(#arrowhead-${element.id})`}
                    transform={`rotate(${element.rotation || 0} ${element.position_x + (element.width || 100) / 2} ${element.position_y})`}
                    className={isEditMode ? 'cursor-move' : 'cursor-default'}
                    style={{ outline: isSelected ? '2px solid hsl(var(--primary))' : 'none' }}
                    onMouseDown={(e) => {
                      if (isEditMode) {
                        handleGraphicElementMouseDown(element, e);
                      }
                    }}
                    onClick={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        onGraphicElementSelect?.(element);
                      }
                    }}
                  />
                </g>
              )}
              
              {element.type === 'text' && element.text_content && (
                <g>
                  <rect
                    x={element.position_x}
                    y={element.position_y - (element.font_size || 14)}
                    width={element.width || 200}
                    height={element.height || 50}
                    fill="transparent"
                    stroke={isSelected ? 'hsl(var(--primary))' : 'transparent'}
                    strokeWidth="2"
                    strokeDasharray={isSelected ? "5,5" : "0"}
                    className={isEditMode ? 'cursor-move' : 'cursor-default'}
                    onMouseDown={(e) => {
                      if (isEditMode) {
                        handleGraphicElementMouseDown(element, e);
                      }
                    }}
                    onClick={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        onGraphicElementSelect?.(element);
                      }
                    }}
                  />
                  <text
                    x={element.position_x + (
                      element.text_align === 'center' ? (element.width || 200) / 2 :
                      element.text_align === 'right' ? (element.width || 200) :
                      0
                    )}
                    y={element.position_y}
                    fontSize={element.font_size || 14}
                    fontFamily={element.font_family || 'Arial'}
                    fontWeight={element.font_weight || 'normal'}
                    fontStyle={element.font_style || 'normal'}
                    textDecoration={element.text_decoration || 'none'}
                    fill={element.color || '#000000'}
                    opacity={element.opacity || 1}
                    textAnchor={element.text_align || 'center'}
                    dominantBaseline="middle"
                    transform={`rotate(${element.rotation || 0} ${element.position_x + (element.width || 200) / 2} ${element.position_y})`}
                    className={isEditMode ? 'cursor-move' : 'cursor-default'}
                    onClick={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        onGraphicElementSelect?.(element);
                      }
                    }}
                  >
                    {element.text_content.split('\n').map((line, i) => (
                      <tspan
                        key={i}
                        x={element.position_x + (
                          element.text_align === 'center' ? (element.width || 200) / 2 :
                          element.text_align === 'right' ? (element.width || 200) :
                          0
                        )}
                        dy={i === 0 ? 0 : (element.font_size || 14) + 2}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Viewport outline in edit mode */}
        {isEditMode && viewport && (
          <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.width}
            height={viewport.height}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeDasharray="10,5"
            opacity="0.8"
            pointerEvents="none"
          />
        )}

        {/* Viewport selection rectangle */}
        {isSelectingViewport && viewportSelectionStart && viewportSelectionCurrent && (
          <rect
            x={Math.min(viewportSelectionStart.x, viewportSelectionCurrent.x)}
            y={Math.min(viewportSelectionStart.y, viewportSelectionCurrent.y)}
            width={Math.abs(viewportSelectionCurrent.x - viewportSelectionStart.x)}
            height={Math.abs(viewportSelectionCurrent.y - viewportSelectionStart.y)}
            fill="hsl(var(--primary))"
            fillOpacity="0.2"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="5,5"
            pointerEvents="none"
          />
        )}

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

      {/* Modal para móvil */}
      <MobileGondolaModal
        gondola={selectedMobileGondola}
        isOpen={showMobileModal}
        onClose={() => {
          setShowMobileModal(false);
          setSelectedMobileGondola(null);
        }}
        onRequestSpace={(gondola) => {
          const message = `Hola! Me interesa reservar el espacio ${gondola.section} (${gondola.type === 'gondola' ? 'Góndola' : 'Puntera'}) en Mayorista Soto.`;
          const url = `https://wa.me/5492234890963?text=${encodeURIComponent(message)}`;
          window.open(url, '_blank');
          setShowMobileModal(false);
        }}
      />

      {/* Mobile Instructions Card */}
      {isMobile && (
        <div className="mt-4 bg-card border border-border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-3">Navegación del mapa</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤏</span>
              <span>Pellizca para hacer zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👆</span>
              <span>Arrastra con un dedo para mover</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <span>Toca una góndola para ver detalles</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};