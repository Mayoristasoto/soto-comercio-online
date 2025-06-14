
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, MapPin, Clock } from 'lucide-react';

const ShippingSection = () => {
  return (
    <section id="envio" className="py-12 sm:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">Envíos y Distribución</h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Llevamos nuestros productos directamente a tu comercio
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="mx-auto bg-purple-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-bold">Envío Gratis</CardTitle>
              <CardDescription>En Mar del Plata desde $20.000</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Realizamos entregas gratuitas en toda la ciudad de Mar del Plata para compras superiores a $20.000.
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="mx-auto bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold">Otras Localidades</CardTitle>
              <CardDescription>Envío por expreso</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Para localidades fuera de Mar del Plata, coordinamos el envío a través de servicios de expreso confiables.
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="mx-auto bg-green-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold">Entrega Rápida</CardTitle>
              <CardDescription>24-48 horas hábiles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Procesamos y despachamos los pedidos en un máximo de 48 horas hábiles desde la confirmación.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ShippingSection;
