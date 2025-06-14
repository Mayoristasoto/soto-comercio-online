
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PriceListsSection = () => {
  const priceLists = [
    {
      title: "Lista Salón",
      description: "Comprando en los salones",
      locations: [
        "Local José Martí - Fortunato de la Plaza 4798",
        "Local Juan B. Justo - Juan B. Justo Rotonda El Gaucho"
      ],
      badge: "Comercio",
      badgeColor: "bg-blue-500"
    },
    {
      title: "Lista Distribución",
      description: "Envío gratis comprando $20.000",
      locations: [
        "Precios para comercios",
        "Envío gratuito en Mar del Plata desde $20.000",
        "Otras localidades: llevamos al expreso"
      ],
      badge: "Comercio",
      badgeColor: "bg-purple-500"
    },
    {
      title: "Lista de Ofertas",
      description: "Promociones especiales",
      locations: [
        "Descuentos especiales",
        "Productos en promoción",
        "Oportunidades limitadas"
      ],
      badge: "Ofertas",
      badgeColor: "bg-red-500"
    }
  ];

  return (
    <section id="precios" className="py-12 sm:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">Listas de Precios</h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Acceso directo a nuestras listas de precios en PDF
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {priceLists.map((list, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-shadow duration-300 border-0 shadow-lg">
              <div className="absolute top-4 right-4">
                <Badge className={`${list.badgeColor} text-white text-xs sm:text-sm`}>
                  {list.badge}
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 pr-16">
                  {list.title}
                </CardTitle>
                <CardDescription className="text-gray-600 text-base sm:text-lg">
                  {list.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {list.locations.map((location, locationIndex) => (
                    <li key={locationIndex} className="flex items-start text-gray-700 text-sm">
                      <div className="bg-green-100 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <span className="text-xs sm:text-sm">{location}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-sm sm:text-base">
                  Ver Precios PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PriceListsSection;
