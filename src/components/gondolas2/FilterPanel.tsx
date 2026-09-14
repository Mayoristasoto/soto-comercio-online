import { useState, useEffect } from "react";
import { Gondola } from "@/pages/Gondolas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RotateCcw, Store, Package, Tag } from "lucide-react";

interface FilterPanelProps {
  gondolas: Gondola[];
  brands: string[];
  categories: string[];
  onFilterChange: (filtered: Gondola[]) => void;
}

export const FilterPanel = ({ gondolas, brands, categories, onFilterChange }: FilterPanelProps) => {
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    let filtered = gondolas;

    if (selectedBrand) {
      filtered = filtered.filter(g => g.brand === selectedBrand);
    }

    if (selectedCategory) {
      filtered = filtered.filter(g => g.category === selectedCategory);
    }

    if (statusFilter) {
      filtered = filtered.filter(g => g.status === statusFilter);
    }

    onFilterChange(filtered);
  }, [selectedBrand, selectedCategory, statusFilter, gondolas, onFilterChange]);

  const clearFilters = () => {
    setSelectedBrand("");
    setSelectedCategory("");
    setStatusFilter("");
  };

  const occupiedCount = gondolas.filter(g => g.status === 'occupied').length;
  const availableCount = gondolas.filter(g => g.status === 'available').length;
  const gondolaCount = gondolas.filter(g => g.type === 'gondola').length;
  const punteraCount = gondolas.filter(g => g.type === 'puntera').length;

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
              <div className="text-2xl font-bold text-red-600">{occupiedCount}</div>
              <div className="text-xs text-red-600">Ocupadas</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
              <div className="text-2xl font-bold text-green-600">{availableCount}</div>
              <div className="text-xs text-green-600">Disponibles</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{gondolaCount}</div>
              <div className="text-xs text-muted-foreground">Góndolas</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{punteraCount}</div>
              <div className="text-xs text-muted-foreground">Punteras</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Estado</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="occupied">Ocupadas</SelectItem>
                <SelectItem value="available">Disponibles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Package className="h-4 w-4" />
              Marca
            </label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Rubro
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los rubros" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={clearFilters} 
            variant="outline" 
            className="w-full"
            disabled={!selectedBrand && !selectedCategory && !statusFilter}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar Filtros
          </Button>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {(selectedBrand || selectedCategory || statusFilter) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtros Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusFilter && (
                <Badge variant="secondary">
                  Estado: {statusFilter === 'occupied' ? 'Ocupadas' : 'Disponibles'}
                </Badge>
              )}
              {selectedBrand && (
                <Badge variant="secondary">
                  Marca: {selectedBrand}
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary">
                  Rubro: {selectedCategory}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};