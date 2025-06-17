
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, MessageCircle } from 'lucide-react';

interface Product {
  name: string;
  image: string;
  description: string;
}

interface InteractiveFeaturesProps {
  products: Product[];
}

const InteractiveFeatures = ({ products }: InteractiveFeaturesProps) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<{[key: string]: number}>({});
  const [showComparison, setShowComparison] = useState(false);

  const toggleFavorite = (productName: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productName)) {
      newFavorites.delete(productName);
    } else {
      newFavorites.add(productName);
    }
    setFavorites(newFavorites);
  };

  const setRating = (productName: string, rating: number) => {
    setRatings(prev => ({ ...prev, [productName]: rating }));
  };

  const favoriteProducts = products.filter(p => favorites.has(p.name));

  return (
    <div className="space-y-6">
      {/* Comparador interactivo */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-purple-800">🔍 Comparador Inteligente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <Button 
              onClick={() => setShowComparison(!showComparison)}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {showComparison ? 'Ocultar' : 'Mostrar'} Comparación Detallada
            </Button>
          </div>
          
          {showComparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-bold text-green-700 mb-2">🥇 Más Populares</h4>
                <ul className="text-sm space-y-1">
                  <li>• Barrigón Mega - El más grande</li>
                  <li>• Juana La Loca - El más original</li>
                  <li>• Love 420 - El más moderno</li>
                </ul>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-bold text-blue-700 mb-2">💰 Mejor Valor</h4>
                <ul className="text-sm space-y-1">
                  <li>• 16 alfajores por $25.000</li>
                  <li>• $1.562 por alfajor</li>
                  <li>• Ahorro del 30% vs compra individual</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sistema de favoritos */}
      {favorites.size > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200">
          <CardHeader>
            <CardTitle className="text-xl text-red-800 flex items-center">
              <Heart className="mr-2" size={20} />
              Tus Favoritos ({favorites.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {favoriteProducts.map((product, index) => (
                <div key={index} className="text-center">
                  <img src={product.image} alt={product.name} className="w-16 h-16 mx-auto rounded-full border-2 border-red-300" />
                  <p className="text-sm font-semibold mt-1">{product.name.split(' ')[0]}</p>
                </div>
              ))}
            </div>
            <Button 
              className="w-full mt-4 bg-red-500 hover:bg-red-600"
              onClick={() => window.open('https://wa.me/5492234266910?text=Hola! Me interesan estos alfajores: ' + Array.from(favorites).join(', '), '_blank')}
            >
              <MessageCircle className="mr-2" size={16} />
              Consultar mis favoritos por WhatsApp
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mini productos interactivos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.slice(0, 4).map((product, index) => (
          <Card key={index} className="relative hover:shadow-lg transition-all duration-300 group">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => toggleFavorite(product.name)}
                className="p-1 rounded-full bg-white/80 hover:bg-white transition-colors"
              >
                <Heart 
                  size={16} 
                  className={favorites.has(product.name) ? 'text-red-500 fill-red-500' : 'text-gray-400'}
                />
              </button>
            </div>
            
            <div className="h-32 overflow-hidden rounded-t-lg">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            <CardContent className="p-3">
              <h4 className="font-semibold text-sm mb-2">{product.name.split(' ').slice(0, 2).join(' ')}</h4>
              
              {/* Rating interactivo */}
              <div className="flex items-center justify-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(product.name, star)}
                    className="p-0.5"
                  >
                    <Star 
                      size={14} 
                      className={
                        star <= (ratings[product.name] || 0) 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-gray-300'
                      }
                    />
                  </button>
                ))}
              </div>
              
              {ratings[product.name] && (
                <Badge className="w-full text-xs bg-yellow-100 text-yellow-800">
                  Tu rating: {ratings[product.name]}/5
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InteractiveFeatures;
