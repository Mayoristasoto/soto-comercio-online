import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Upload, X, Image } from "lucide-react";

interface BrandPartner {
  id: string;
  name: string;
  logo_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const BrandManagement = () => {
  const [brands, setBrands] = useState<BrandPartner[]>([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_partners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Error al cargar las marcas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleImageUpload = async (file: File, brandId: string) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${brandId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('brand_partners')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', brandId);

      if (updateError) throw updateError;

      toast.success('Logo subido exitosamente');
      loadBrands();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error('Ingresa el nombre de la marca');
      return;
    }

    try {
      const maxOrder = Math.max(...brands.map(b => b.display_order), 0);
      
      const { error } = await supabase
        .from('brand_partners')
        .insert({
          name: newBrandName,
          display_order: maxOrder + 1
        });

      if (error) throw error;

      setNewBrandName('');
      toast.success('Marca agregada exitosamente');
      loadBrands();
    } catch (error) {
      console.error('Error adding brand:', error);
      toast.error('Error al agregar la marca');
    }
  };

  const deleteBrand = async (brandId: string) => {
    try {
      const { error } = await supabase
        .from('brand_partners')
        .update({ is_active: false })
        .eq('id', brandId);

      if (error) throw error;

      toast.success('Marca eliminada exitosamente');
      loadBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Error al eliminar la marca');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Cargando marcas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Gestión de Marcas</h3>
      </div>

      {/* Add new brand */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="brand-name">Nueva Marca</Label>
              <Input
                id="brand-name"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nombre de la marca"
                onKeyPress={(e) => e.key === 'Enter' && addBrand()}
              />
            </div>
            <Button onClick={addBrand}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Brands list */}
      <div className="space-y-4">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Image className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium">{brand.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Orden: {brand.display_order}
                  </p>
                </div>

                <div className="flex gap-2">
                  <label htmlFor={`upload-${brand.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      className="cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Subiendo...' : 'Logo'}
                      </span>
                    </Button>
                  </label>
                  <input
                    id={`upload-${brand.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, brand.id);
                    }}
                  />
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteBrand(brand.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {brands.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay marcas configuradas. Agrega la primera marca arriba.
        </div>
      )}
    </div>
  );
};