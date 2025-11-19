import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

// Container con padding responsive
export function ResponsiveContainer({ 
  children, 
  className = "",
  noPadding = false 
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "w-full mx-auto",
      !noPadding && "container-padding",
      className
    )}>
      {children}
    </div>
  );
}

// Sección con espaciado responsive
export function ResponsiveSection({ 
  children, 
  className = "" 
}: ResponsiveContainerProps) {
  return (
    <section className={cn("section-spacing", className)}>
      {children}
    </section>
  );
}

// Grid responsive automático
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, md: 2, lg: 3 },
  gap = 4,
  className = "" 
}: ResponsiveGridProps) {
  const gridClasses = [
    `grid`,
    `gap-${gap}`,
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Stack responsive (columna en móvil, fila en desktop)
interface ResponsiveStackProps {
  children: ReactNode;
  direction?: "row" | "col";
  breakpoint?: "sm" | "md" | "lg";
  gap?: number;
  className?: string;
}

export function ResponsiveStack({
  children,
  direction = "row",
  breakpoint = "md",
  gap = 4,
  className = ""
}: ResponsiveStackProps) {
  const stackClasses = cn(
    "flex flex-col",
    `gap-${gap}`,
    direction === "row" && `${breakpoint}:flex-row`,
    className
  );

  return <div className={stackClasses}>{children}</div>;
}
