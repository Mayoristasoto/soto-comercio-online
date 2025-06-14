
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm">
            Para Comerciantes
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Mayorista Soto
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8 leading-relaxed px-2">
            Accede a nuestras <span className="font-semibold text-purple-600">listas de precios</span> para comerciantes. 
            Precios especiales para salones, distribución y ofertas únicas.
          </p>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-purple-100 mx-2 sm:mx-0">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-2 sm:p-3">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Envío GRATIS en Mar del Plata</h3>
            <p className="text-base sm:text-lg text-gray-600">Lista Distribución: envío gratis desde <span className="font-bold text-green-600">$20.000</span></p>
          </div>
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto">
            Ver Listas de Precios
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
