
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { Monitor, Smartphone, ExternalLink, ArrowLeft } from 'lucide-react';

const Centum = () => {
  const webUrl = "https://plataforma4.centum.com.ar:22480/CentumSuite/BL11/?dominio=MayoristaSotoSAS";
  const mobileUrl = "https://plataforma4.centum.com.ar:22480/CentumSuiteMobileV2/BL11/?dominio=MayoristaSotoSAS";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="pt-6 pb-4 sticky top-0 bg-white/80 backdrop-blur-sm z-50 border-b border-blue-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Volver al inicio</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
                alt="Mayorista Soto Logo" 
                className="h-10 sm:h-12 w-auto"
              />
              <div>
                <h1 className="font-bold text-lg text-gray-800">Mayorista Soto</h1>
                <p className="text-sm text-gray-600">Sistema Centum</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent leading-tight">
              Centum Suite
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed mb-8">
              Accesos al sistema de gestión de Mayorista Soto
            </p>
          </div>
        </div>
      </section>

      {/* Access Cards */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Web Version */}
            <Card className="cursor-pointer transition-all duration-300 border-2 hover:border-blue-300 hover:shadow-xl hover:-translate-y-2 group">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 p-6 bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Monitor size={40} className="text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                  Versión Web
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Acceso desde computadora
                </CardDescription>
                <Badge variant="outline" className="w-fit mx-auto mt-2 border-blue-200 text-blue-700">
                  Desktop
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <a href={webUrl} target="_blank" rel="noopener noreferrer">
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white group-hover:bg-blue-600"
                    size="lg"
                  >
                    Acceder a Versión Web
                    <ExternalLink size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Mobile Version */}
            <Card className="cursor-pointer transition-all duration-300 border-2 hover:border-green-300 hover:shadow-xl hover:-translate-y-2 group">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 p-6 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Smartphone size={40} className="text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                  Versión Mobile
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Acceso desde celular
                </CardDescription>
                <Badge variant="outline" className="w-fit mx-auto mt-2 border-green-200 text-green-700">
                  Móvil
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <a href={mobileUrl} target="_blank" rel="noopener noreferrer">
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600 text-white group-hover:bg-green-600"
                    size="lg"
                  >
                    Acceder a Versión Mobile
                    <ExternalLink size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <img 
                src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
                alt="Mayorista Soto Logo" 
                className="h-10 w-auto"
              />
              <div>
                <p className="font-semibold text-gray-800">Mayorista Soto</p>
                <p className="text-sm text-gray-600">Sistema Centum</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-600">
                Acceso seguro al sistema de gestión
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Centum;
