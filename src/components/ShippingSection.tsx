
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const ShippingSection = () => {
  return (
    <section id="envio" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Envíos a Todo el País</h2>
            <p className="text-xl text-gray-600">
              Recibe tus productos de forma rápida y segura
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-green-500 rounded-full p-3 mr-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">Envío GRATIS</h3>
                      <p className="text-green-600 font-semibold">Desde $20.000</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-lg">
                    Aprovecha nuestro envío gratuito en todas las compras que superen los $20.000. 
                    Entrega rápida y segura a todo el país.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-purple-100 rounded-full p-2 mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">Entrega Rápida</h4>
                  <p className="text-gray-600">24-48 horas en CABA y GBA, 3-5 días en el interior</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-purple-100 rounded-full p-2 mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">Seguimiento</h4>
                  <p className="text-gray-600">Rastreo en tiempo real de tu pedido</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-purple-100 rounded-full p-2 mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">Embalaje Seguro</h4>
                  <p className="text-gray-600">Protección garantizada para todos los productos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShippingSection;
