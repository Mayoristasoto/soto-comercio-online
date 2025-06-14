
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-purple-50 via-white to-pink-50 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white">
            Para Comerciantes
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Mayorista Soto
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            Accede a nuestras <span className="font-semibold text-purple-600">listas de precios exclusivas</span> para comerciantes. 
            Precios especiales para salones, distribución y ofertas únicas.
          </p>
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-purple-100">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Envío GRATIS</h3>
            <p className="text-lg text-gray-600">En compras desde <span className="font-bold text-green-600">$20.000</span></p>
          </div>
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-8 py-3 text-lg">
            Ver Listas de Precios
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
