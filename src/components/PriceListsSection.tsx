
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PriceListsSection = () => {
  const priceLists = [
    {
      title: "Salones Comerciales",
      description: "Precios especiales para salones de belleza y peluquerías",
      features: [
        "Descuentos por volumen",
        "Productos profesionales",
        "Asesoramiento técnico",
        "Entrega programada"
      ],
      badge: "Popular",
      badgeColor: "bg-blue-500"
    },
    {
      title: "Distribución",
      description: "Precios mayoristas para distribuidores autorizados",
      features: [
        "Márgenes competitivos",
        "Territorios exclusivos",
        "Soporte de marketing",
        "Capacitación de producto"
      ],
      badge: "Mayorista",
      badgeColor: "bg-purple-500"
    },
    {
      title: "Ofertas Especiales",
      description: "Promociones y liquidaciones por tiempo limitado",
      features: [
        "Descuentos hasta 50%",
        "Productos estacionales",
        "Liquidación de stock",
        "Oportunidades únicas"
      ],
      badge: "Limitado",
      badgeColor: "bg-red-500"
    }
  ];

  return (
    <section id="precios" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Listas de Precios</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Elige la lista de precios que mejor se adapte a tu tipo de negocio
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {priceLists.map((list, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-shadow duration-300 border-0 shadow-lg">
              <div className="absolute top-4 right-4">
                <Badge className={`${list.badgeColor} text-white`}>
                  {list.badge}
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                  {list.title}
                </CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  {list.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {list.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-700">
                      <div className="bg-green-100 rounded-full p-1 mr-3">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white">
                  Solicitar Acceso
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
