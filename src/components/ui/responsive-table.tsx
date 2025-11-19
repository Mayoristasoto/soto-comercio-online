import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  mobileCardRender?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  mobileCardRender,
  onRowClick,
  emptyMessage = "No hay datos para mostrar",
  className = "",
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Vista móvil: Cards
  const MobileView = () => (
    <div className="md:hidden space-y-3">
      {data.map((item) => {
        const key = keyExtractor(item);
        
        if (mobileCardRender) {
          return (
            <Card
              key={key}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4">
                {mobileCardRender(item)}
              </CardContent>
            </Card>
          );
        }

        // Card por defecto
        return (
          <Card
            key={key}
            className={onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4 space-y-2">
              {columns.map((column) => {
                if (column.hideOnMobile) return null;
                
                const value = column.render
                  ? column.render(item)
                  : item[column.key as keyof T];

                return (
                  <div key={String(column.key)} className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {column.label}:
                    </span>
                    <span className="text-sm text-right flex-1">{value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Vista desktop: Tabla
  const DesktopView = () => (
    <div className="hidden md:block border rounded-lg overflow-hidden">
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.key)} className={column.className}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={onRowClick ? "cursor-pointer" : ""}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={String(column.key)} className={column.className}>
                  {column.render
                    ? column.render(item)
                    : item[column.key as keyof T]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <MobileView />
      <DesktopView />
    </>
  );
}
