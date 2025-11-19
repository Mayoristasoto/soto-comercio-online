import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "daterange";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface AdvancedFiltersProps<T> {
  data: T[];
  filters: FilterConfig[];
  onFilter: (filtered: T[]) => void;
  searchKeys?: (keyof T)[];
  className?: string;
}

export function AdvancedFilters<T extends Record<string, any>>({
  data,
  filters,
  onFilter,
  searchKeys = [],
  className = "",
}: AdvancedFiltersProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(false);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Búsqueda de texto
    if (searchTerm && searchKeys.length > 0) {
      const search = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((key) => {
          const value = item[key];
          return value?.toString().toLowerCase().includes(search);
        })
      );
    }

    // Filtros avanzados
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((item) => {
          const itemValue = item[key];
          if (Array.isArray(value)) {
            // Rango de fechas
            const [start, end] = value;
            return itemValue >= start && itemValue <= end;
          }
          return itemValue === value;
        });
      }
    });

    return result;
  }, [data, searchTerm, searchKeys, activeFilters]);

  // Aplicar filtros cuando cambian
  useMemo(() => {
    onFilter(filteredData);
  }, [filteredData, onFilter]);

  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilter = (key: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm("");
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Búsqueda */}
        {searchKeys.length > 0 && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Botón de filtros avanzados */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros Avanzados</SheetTitle>
              <SheetDescription>
                Refina los resultados con filtros específicos
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  
                  {filter.type === "text" && (
                    <Input
                      placeholder={filter.placeholder}
                      value={activeFilters[filter.key] || ""}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  )}

                  {filter.type === "select" && filter.options && (
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={activeFilters[filter.key] || ""}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    >
                      <option value="">Todos</option>
                      {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {activeFilters[filter.key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearFilter(filter.key)}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
              ))}

              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full"
                >
                  Limpiar todos los filtros
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filtros activos */}
      {(activeFilterCount > 0 || searchTerm) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredData.length} resultados
          </span>
          
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: {searchTerm}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearchTerm("")}
              />
            </Badge>
          )}

          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters.find((f) => f.key === key);
            if (!filter || !value) return null;

            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {filter.label}: {value}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter(key)}
                />
              </Badge>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs"
          >
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
}
