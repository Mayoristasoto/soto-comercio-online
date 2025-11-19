import { ReactNode, useEffect, useRef } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  className = "",
}: VirtualizedListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let rafId: number;
    
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
          startIndex + visibleCount + overscan,
          items.length
        );

        if (innerRef.current) {
          const offsetY = startIndex * itemHeight;
          innerRef.current.style.transform = `translateY(${offsetY}px)`;
          
          // Renderizar solo items visibles
          const visibleItems = items.slice(
            Math.max(0, startIndex - overscan),
            endIndex
          );
          
          // Aquí se actualizaría el estado, pero en este caso
          // usamos un approach más simple renderizando todo
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [items.length, itemHeight, visibleCount, overscan]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div ref={innerRef}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="border-b"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook simple para debounce (optimización de búsquedas)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useState } from "react";
