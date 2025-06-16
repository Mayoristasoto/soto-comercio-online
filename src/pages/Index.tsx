
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { User, Store, Truck } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header con logo */}
      <header className="pt-8 pb-4">
        <div className="container mx-auto px-4 text-center">
          <img 
            src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
            alt="Mayorista Soto Logo" 
            className="h-16 sm:h-20 w-auto mx-auto mb-4"
          />
        </div>
      </header>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            ¿Qué tipo de cliente sos?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Elegí la opción que mejor describa tu actividad para ver los precios y productos correspondientes.
          </p>
        </div>

        {/* Cards de selección */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Particular */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-purple-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                <User size={32} className="text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">Particular</CardTitle>
              <CardDescription className="text-gray-600">
                Comprás para tu casa o consumo personal.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                size="lg"
              >
                Ver lista para particulares
              </Button>
            </CardContent>
          </Card>

          {/* Comercio */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-purple-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Store size={32} className="text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">Comercio</CardTitle>
              <CardDescription className="text-gray-600">
                Tenés un kiosco, almacén, despensa o candy bar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/comercio">
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                >
                  Ver lista para comercios
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Distribuidor */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-purple-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Truck size={32} className="text-orange-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">Distribuidor</CardTitle>
              <CardDescription className="text-gray-600">
                Sos revendedor o tenés una distribuidora que atiende a otros comercios.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                size="lg"
              >
                Ver lista para distribuidores
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pie de página */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-2">
            <strong>Mayorista Soto</strong> - Tu distribuidora de confianza
          </p>
          <p className="text-sm text-gray-500">
            Para consultas: contacto@mayoristasoto.com
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
