
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { ArrowLeft, User, FileText, Tag } from 'lucide-react';

const Particular = () => {
  const priceLists = [
    {
      title: "Lista Completa",
      description: "Todos nuestros productos con precios para particulares",
      icon: <FileText size={32} className="text-blue-600" />,
      badge: "Particular",
      badgeColor: "bg-blue-500",
      pdfUrl: "https://drive.google.com/file/d/1Jl0LxeoNuEJ4F3xzKy9tw_MpwngGS6dr/view"
    },
    {
      title: "Lista de Ofertas",
      description: "Promociones especiales y descuentos",
      icon: <Tag size={32} className="text-red-600" />,
      badge: "Ofertas",
      badgeColor: "bg-red-500",
      pdfUrl: "https://drive.google.com/file/d/1SaN_owL5V38t5syfRcGxLDVMxU4ElKZa/view"
    }
  ];

  const handlePdfClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header con logo */}
      <header className="pt-8 pb-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              Volver al inicio
            </Link>
            <img 
              src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
              alt="Mayorista Soto Logo" 
              className="h-12 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <Badge className="mb-4 bg-blue-500 text-white text-sm">
            Para Particulares
          </Badge>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 rounded-full p-4">
              <User size={40} className="text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent">
            Listas de Precios para Particulares
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Accede a nuestras listas de precios especiales para compradores particulares.
          </p>
        </div>

        {/* Cards de listas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {priceLists.map((list, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-shadow duration-300 border-0 shadow-lg">
              <div className="absolute top-4 right-4">
                <Badge className={`${list.badgeColor} text-white text-xs sm:text-sm`}>
                  {list.badge}
                </Badge>
              </div>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center">
                  {list.icon}
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 pr-16">
                  {list.title}
                </CardTitle>
                <CardDescription className="text-gray-600 text-base sm:text-lg">
                  {list.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => handlePdfClick(list.pdfUrl)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-700 hover:to-purple-600 text-white text-sm sm:text-base"
                >
                  Ver Precios PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Información adicional */}
        <div className="text-center mt-12 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Necesitás ayuda?</h3>
            <p className="text-gray-600 mb-4">
              Si tenés alguna consulta sobre nuestros productos o precios, no dudes en contactarnos.
            </p>
            <p className="text-sm text-gray-500">
              Contacto: contacto@mayoristasoto.com
            </p>
          </div>
        </div>

        {/* Pie de página */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-2">
            <strong>Mayorista Soto</strong> - Tu distribuidora de confianza
          </p>
          <p className="text-sm text-gray-500">
            Precios especiales para particulares
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Particular;
