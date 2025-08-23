import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

interface BrandPartner {
  id: string;
  name: string;
  logo_url: string | null;
  display_order: number;
}

export const BrandCarousel = () => {
  const [brands, setBrands] = useState<BrandPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
        // Show fallback brands if error
        setBrands([
          { id: '1', name: 'Marca Lácteos', logo_url: null, display_order: 1 },
          { id: '2', name: 'Productos Premium', logo_url: null, display_order: 2 },
          { id: '3', name: 'Bebidas Top', logo_url: null, display_order: 3 },
          { id: '4', name: 'Snacks Elite', logo_url: null, display_order: 4 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBrands();

    // Real-time updates
    const channel = supabase
      .channel('brand-partners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'brand_partners'
      }, () => {
        loadBrands();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-muted-foreground">Cargando marcas...</div>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay marcas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {brands.map((brand) => (
            <CarouselItem key={brand.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
              <Card className="border-2 border-muted/50 hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {brand.logo_url ? (
                      <div className="w-16 h-16 flex items-center justify-center">
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {brand.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{brand.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Cliente Premium
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};