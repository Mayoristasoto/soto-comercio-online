
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const ShippingSection = () => {
  return (
    <section id="envio" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Información de Envíos</h2>
            <p className="text-xl text-gray-600">
              Conoce nuestras modalidades de entrega
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-green-500 rounded-full p-3 mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Mar del Plata</h3>
                    <p className="text-green-600 font-semibold">Envío GRATIS</p>
                  </div>
                </div>
                <p className="text-gray-700 text-lg mb-4">
                  Envío gratuito en Mar del Plata para la Lista Distribución desde $20.000
                </p>
                <p className="text-gray-600">
                  Entrega rápida y segura en toda la ciudad
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-500 rounded-full p-3 mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Otras Localidades</h3>
                    <p className="text-blue-600 font-semibold">Al Expreso</p>
                  </div>
                </div>
                <p className="text-gray-700 text-lg mb-4">
                  Llevamos tu pedido al expreso que elijas
                </p>
                <p className="text-gray-600">
                  El cliente paga el flete en destino
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShippingSection;
