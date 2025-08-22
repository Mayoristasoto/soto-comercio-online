import { useState } from "react";
import { Search, Package2, Store, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Gondola } from "@/pages/GondolasEdit";

interface GondolasListProps {
  gondolas: Gondola[];
  selectedGondola: Gondola | null;
  onGondolaSelect: (gondola: Gondola) => void;
}

export const GondolasList = ({ gondolas, selectedGondola, onGondolaSelect }: GondolasListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter gondolas based on search and filters
  const filteredGondolas = gondolas.filter(gondola => {
    const matchesSearch = 
      gondola.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gondola.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gondola.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gondola.brand && gondola.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || gondola.type === typeFilter;
    const matchesStatus = statusFilter === "all" || gondola.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    return status === "occupied" ? "destructive" : "default";
  };

  const getStatusText = (status: string) => {
    return status === "occupied" ? "Ocupada" : "Disponible";
  };

  const getTypeIcon = (type: string) => {
    return type === "gondola" ? Package2 : Store;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Lista de Góndolas
        </CardTitle>
        
        {/* Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, sección, categoría o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="gondola">Góndolas</SelectItem>
                <SelectItem value="puntera">Punteras</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="occupied">Ocupadas</SelectItem>
                <SelectItem value="available">Disponibles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="px-6 pb-3">
          <div className="text-sm text-muted-foreground">
            {filteredGondolas.length} de {gondolas.length} elementos
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-2 px-6 pb-6">
            {filteredGondolas.map((gondola) => {
              const TypeIcon = getTypeIcon(gondola.type);
              const isSelected = selectedGondola?.id === gondola.id;
              
              return (
                <Button
                  key={gondola.id}
                  variant={isSelected ? "default" : "ghost"}
                  className={`w-full h-auto p-3 justify-start ${
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                  onClick={() => onGondolaSelect(gondola)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <TypeIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {gondola.id.toUpperCase()}
                        </span>
                        <Badge 
                          variant={getStatusColor(gondola.status)}
                          className="text-xs"
                        >
                          {getStatusText(gondola.status)}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Sección: {gondola.section}</div>
                        <div>Categoría: {gondola.category}</div>
                        {gondola.brand && (
                          <div>Marca: {gondola.brand}</div>
                        )}
                        {gondola.endDate && (
                          <div>Hasta: {gondola.endDate}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
            
            {filteredGondolas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No se encontraron góndolas</p>
                <p className="text-xs">Intenta con otros filtros</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};