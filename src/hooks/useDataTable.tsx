import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  defaultVisible?: boolean;
}

interface DataTableHeaderProps<T> {
  columns: Column<T>[];
  sortBy?: keyof T | string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: keyof T | string, order: "asc" | "desc") => void;
  visibleColumns?: string[];
  onColumnVisibilityChange?: (columns: string[]) => void;
}

export function DataTableHeader<T>({
  columns,
  sortBy,
  sortOrder,
  onSort,
  visibleColumns,
  onColumnVisibilityChange,
}: DataTableHeaderProps<T>) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const handleSort = (key: keyof T | string) => {
    if (!onSort) return;
    
    const newOrder =
      sortBy === key && sortOrder === "asc" ? "desc" : "asc";
    onSort(key, newOrder);
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-2">
        {onSort && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Ordenar
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={sortBy ? `${String(sortBy)}-${sortOrder}` : undefined}
              >
                {columns
                  .filter((col) => col.sortable)
                  .map((col) => (
                    <div key={String(col.key)}>
                      <DropdownMenuRadioItem
                        value={`${String(col.key)}-asc`}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label} (A-Z)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value={`${String(col.key)}-desc`}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label} (Z-A)
                      </DropdownMenuRadioItem>
                    </div>
                  ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Hook para manejar estado de tabla con paginación y ordenamiento
export function useDataTable<T>(data: T[], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof T | string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: keyof T | string, order: "asc" | "desc") => {
    setSortBy(key);
    setSortOrder(order);
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortBy) return 0;

    const aVal = a[sortBy as keyof T];
    const bVal = b[sortBy as keyof T];

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return {
    data: paginatedData,
    currentPage,
    totalPages,
    totalItems: sortedData.length,
    setCurrentPage,
    sortBy,
    sortOrder,
    handleSort,
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    nextPage: () => setCurrentPage((prev) => Math.min(prev + 1, totalPages)),
    prevPage: () => setCurrentPage((prev) => Math.max(prev - 1, 1)),
  };
}
